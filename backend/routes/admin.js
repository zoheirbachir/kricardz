const express = require('express');
const db = require('../db/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

const LIST_COLS = 'id, name, email, phone, role, kyc_status, lessor_type, kyc_reviewed_at, created_at';
const DETAIL_COLS = `id, name, email, phone, role, verified, id_verified, kyc_status,
  kyc_rejection_reason, kyc_reviewed_at, lessor_type, document_type, document_number,
  driving_license_issued_date, driving_license_expiry_date, agency_legal_name, agency_commercial_reg_number, kyc_docs, created_at`;

/* Exclude admin accounts from the review queue everywhere */
const NOT_ADMIN = '(is_admin IS NULL OR is_admin = 0)';

function kycCounts() {
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const s of Object.keys(counts)) {
    counts[s] = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE kyc_status = ? AND ${NOT_ADMIN}`).get(s).c;
  }
  return counts;
}

/* List KYC submissions, optionally filtered by status (?status=pending|approved|rejected|all) */
router.get('/kyc', adminAuth, (req, res) => {
  const status = req.query.status || 'pending';
  let submissions;
  if (status === 'all') {
    submissions = db.prepare(
      `SELECT ${LIST_COLS} FROM users WHERE kyc_status IN ('pending','approved','rejected') AND ${NOT_ADMIN} ORDER BY created_at DESC`
    ).all();
  } else {
    submissions = db.prepare(
      `SELECT ${LIST_COLS} FROM users WHERE kyc_status = ? AND ${NOT_ADMIN} ORDER BY created_at DESC`
    ).all(status);
  }
  res.json({ submissions, counts: kycCounts() });
});

/* Full detail of one submission, including uploaded document paths */
router.get('/kyc/:id', adminAuth, (req, res) => {
  const u = db.prepare(`SELECT ${DETAIL_COLS} FROM users WHERE id = ?`).get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  let docs = {};
  try { docs = JSON.parse(u.kyc_docs || '{}'); } catch {}
  res.json({ ...u, kyc_docs: docs });
});

/* Approve: mark account verified */
router.post('/kyc/:id/approve', adminAuth, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.prepare(`UPDATE users
    SET kyc_status = 'approved', verified = 1, id_verified = 1,
        kyc_rejection_reason = NULL, kyc_reviewed_at = datetime('now')
    WHERE id = ?`).run(req.params.id);
  res.json({ ok: true, kyc_status: 'approved' });
});

/* Reject: record a reason, keep account unverified */
router.post('/kyc/:id/reject', adminAuth, (req, res) => {
  const reason = (req.body && req.body.reason ? String(req.body.reason) : '').trim();
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.prepare(`UPDATE users
    SET kyc_status = 'rejected', verified = 0, id_verified = 0,
        kyc_rejection_reason = ?, kyc_reviewed_at = datetime('now')
    WHERE id = ?`).run(reason || null, req.params.id);
  res.json({ ok: true, kyc_status: 'rejected' });
});

module.exports = router;
