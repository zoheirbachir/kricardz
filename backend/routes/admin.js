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

/* ════════════ Full admin management (users, cars, agencies, stats) ════════════ */

/* ── Dashboard stats ── */
router.get('/stats', adminAuth, (req, res) => {
  const c = (sql, ...p) => db.prepare(sql).get(...p).c;
  res.json({
    users: c(`SELECT COUNT(*) c FROM users WHERE ${NOT_ADMIN}`),
    owners: c(`SELECT COUNT(*) c FROM users WHERE role='owner' AND ${NOT_ADMIN}`),
    renters: c(`SELECT COUNT(*) c FROM users WHERE role='renter' AND ${NOT_ADMIN}`),
    banned: c(`SELECT COUNT(*) c FROM users WHERE banned=1`),
    agencies: c('SELECT COUNT(*) c FROM agencies'),
    cars: c('SELECT COUNT(*) c FROM cars'),
    available_cars: c('SELECT COUNT(*) c FROM cars WHERE available=1'),
    bookings: c('SELECT COUNT(*) c FROM bookings'),
    reviews: c('SELECT COUNT(*) c FROM reviews'),
    contracts: c('SELECT COUNT(*) c FROM contracts'),
    kyc: kycCounts(),
  });
});

/* Cascade helpers (FK is ON, so delete children before parents) */
function cascadeDeleteCar(id) {
  db.prepare('DELETE FROM reviews WHERE car_id = ?').run(id);
  db.prepare('DELETE FROM favorites WHERE car_id = ?').run(id);
  db.prepare('DELETE FROM bookings WHERE car_id = ?').run(id);
  db.prepare('DELETE FROM car_locations WHERE car_id = ?').run(id);
  db.prepare('DELETE FROM cars WHERE id = ?').run(id);
}
function cascadeDeleteUser(id) {
  for (const car of db.prepare('SELECT id FROM cars WHERE owner_id = ?').all(id)) cascadeDeleteCar(car.id);
  db.prepare('DELETE FROM agencies WHERE owner_id = ?').run(id);
  db.prepare('DELETE FROM bookings WHERE renter_id = ?').run(id);
  db.prepare('DELETE FROM reviews WHERE reviewer_id = ?').run(id);
  db.prepare('DELETE FROM favorites WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

/* ── Users ── */
router.get('/users', adminAuth, (req, res) => {
  const { search = '', role = '' } = req.query;
  let q = `SELECT id, name, email, phone, role, is_admin, COALESCE(banned,0) AS banned, verified, kyc_status, lessor_type, created_at,
    (SELECT COUNT(*) FROM cars c WHERE c.owner_id = u.id) AS car_count
    FROM users u WHERE 1=1`;
  const p = [];
  if (search) { q += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  if (role) { q += ' AND u.role = ?'; p.push(role); }
  q += ' ORDER BY u.created_at DESC';
  res.json(db.prepare(q).all(...p).map(u => ({ ...u, is_admin: Boolean(u.is_admin), banned: Boolean(u.banned), verified: Boolean(u.verified) })));
});

router.delete('/users/:id', adminAuth, (req, res) => {
  const u = db.prepare('SELECT id, is_admin, role FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (u.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  if (u.is_admin === 1 || u.role === 'admin') return res.status(400).json({ error: 'Impossible de supprimer un administrateur.' });
  cascadeDeleteUser(u.id);
  res.json({ ok: true });
});

router.post('/users/:id/ban', adminAuth, (req, res) => {
  const u = db.prepare('SELECT id, is_admin, role, COALESCE(banned,0) AS banned FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (u.is_admin === 1 || u.role === 'admin') return res.status(400).json({ error: 'Impossible de bloquer un administrateur.' });
  const next = u.banned ? 0 : 1;
  db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(next, u.id);
  res.json({ ok: true, banned: Boolean(next) });
});

/* ── Cars ── */
router.get('/cars', adminAuth, (req, res) => {
  const { search = '' } = req.query;
  let q = `SELECT c.id, c.title, c.brand, c.model, c.year, c.type, c.wilaya, c.price_per_day, c.available, c.created_at,
    u.name AS owner_name FROM cars c JOIN users u ON c.owner_id = u.id WHERE 1=1`;
  const p = [];
  if (search) { q += ' AND (c.title LIKE ? OR c.brand LIKE ? OR u.name LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  q += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(q).all(...p).map(c => ({ ...c, available: Boolean(c.available) })));
});

router.delete('/cars/:id', adminAuth, (req, res) => {
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  cascadeDeleteCar(car.id);
  res.json({ ok: true });
});

router.post('/cars/:id/availability', adminAuth, (req, res) => {
  const car = db.prepare('SELECT id, available FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  const next = car.available ? 0 : 1;
  db.prepare('UPDATE cars SET available = ? WHERE id = ?').run(next, car.id);
  res.json({ ok: true, available: Boolean(next) });
});

/* ── Agencies ── */
const ADMIN_AGENCY_SELECT = `SELECT a.id, a.name, a.wilaya, a.city, a.agency_type, a.verified, a.created_at,
  u.id AS owner_id, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone, u.kyc_status AS owner_kyc,
  (SELECT COUNT(*) FROM cars c WHERE c.owner_id = a.owner_id) AS vehicle_count
  FROM agencies a JOIN users u ON a.owner_id = u.id`;

router.get('/agencies', adminAuth, (req, res) => {
  res.json(db.prepare(ADMIN_AGENCY_SELECT + ' ORDER BY a.verified ASC, a.created_at DESC').all().map(a => ({ ...a, verified: Boolean(a.verified) })));
});

/* Accept / un-accept an agency */
router.post('/agencies/:id/verify', adminAuth, (req, res) => {
  const a = db.prepare('SELECT id, verified FROM agencies WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agence introuvable' });
  const next = a.verified ? 0 : 1;
  db.prepare('UPDATE agencies SET verified = ? WHERE id = ?').run(next, a.id);
  res.json({ ok: true, verified: Boolean(next) });
});

router.delete('/agencies/:id', adminAuth, (req, res) => {
  const a = db.prepare('SELECT id FROM agencies WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Agence introuvable' });
  db.prepare('DELETE FROM agencies WHERE id = ?').run(a.id);
  res.json({ ok: true });
});

/* ── Bookings (read-only overview) ── */
router.get('/bookings', adminAuth, (req, res) => {
  res.json(db.prepare(`SELECT b.id, b.start_date, b.end_date, b.total_price, b.status, b.created_at,
    c.title AS car_title, u.name AS renter_name
    FROM bookings b JOIN cars c ON b.car_id = c.id JOIN users u ON b.renter_id = u.id
    ORDER BY b.created_at DESC LIMIT 200`).all());
});

/* ── Contracts oversight (read-only) ── */
router.get('/contracts', adminAuth, (req, res) => {
  const { type = '' } = req.query;
  let q = `SELECT ct.id, ct.contract_number, ct.type, ct.status, ct.created_at,
      ag.name AS agency_owner_name, rn.name AS renter_name
    FROM contracts ct
    LEFT JOIN users ag ON ct.agency_owner_id = ag.id
    LEFT JOIN users rn ON ct.renter_id = rn.id WHERE 1=1`;
  const p = [];
  if (type === 'partnership' || type === 'rental') { q += ' AND ct.type = ?'; p.push(type); }
  q += ' ORDER BY ct.created_at DESC LIMIT 300';
  res.json(db.prepare(q).all(...p));
});

/* ── Security audit log (email verification + password reset events) ── */
router.get('/auth-events', adminAuth, (req, res) => {
  res.json(db.prepare(`SELECT id, user_id, email, type, ip, created_at
    FROM auth_events ORDER BY created_at DESC LIMIT 200`).all());
});

module.exports = router;
