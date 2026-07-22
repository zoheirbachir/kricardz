const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { PRIVATE_UPLOADS_ROOT } = require('../config/paths');
const { adminAuth } = require('../middleware/auth');
const backup = require('../lib/backup');
const settings = require('../lib/settings');
const { notify } = require('../lib/notify');

const router = express.Router();

const LIST_COLS = 'id, name, email, phone, role, kyc_status, lessor_type, kyc_reviewed_at, created_at';
const DETAIL_COLS = `id, name, email, phone, role, verified, id_verified, kyc_status,
  kyc_rejection_reason, kyc_reviewed_at, lessor_type, document_type, document_number,
  driving_license_number, driving_license_issued_date, driving_license_expiry_date,
  agency_legal_name, agency_commercial_reg_number, agency_address, national_id_number, kyc_docs, created_at`;

/* Exclude admin accounts from the review queue everywhere */
const NOT_ADMIN = '(is_admin IS NULL OR is_admin = 0)';

/* Same two locations the /kyc-file route serves from. */
const KYC_DIR = path.join(PRIVATE_UPLOADS_ROOT, 'kyc');
const LEGACY_KYC_DIR = path.join(__dirname, '../private_uploads/kyc');

function kycCounts() {
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const s of Object.keys(counts)) {
    counts[s] = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE kyc_status = ? AND ${NOT_ADMIN}`).get(s).c;
  }
  return counts;
}

/* ── Which stored identity documents are actually still on disk? ──
   Files uploaded before the persistent-storage fix were written inside the deploy
   directory and destroyed on each redeploy, leaving the filename in the database
   but no file. This reports exactly who has to re-upload. */
router.get('/kyc/audit', adminAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT id, name, email, phone, role, kyc_status, created_at, kyc_docs
     FROM users WHERE kyc_docs IS NOT NULL AND kyc_docs != '{}' AND ${NOT_ADMIN}
     ORDER BY created_at DESC`
  ).all();

  const affected = [];
  let filesTotal = 0, filesMissing = 0;
  for (const u of rows) {
    let docs = {};
    try { docs = JSON.parse(u.kyc_docs || '{}'); } catch { continue; }
    const missing = [];
    for (const [field, p] of Object.entries(docs)) {
      if (!p) continue;
      filesTotal++;
      const name = String(p).split('/').pop();
      const found = [path.join(KYC_DIR, name), path.join(LEGACY_KYC_DIR, name)].some(f => fs.existsSync(f));
      if (!found) { missing.push(field); filesMissing++; }
    }
    if (missing.length) {
      affected.push({
        id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
        kyc_status: u.kyc_status, created_at: u.created_at,
        missing, total: Object.keys(docs).length,
      });
    }
  }
  res.json({
    users_with_docs: rows.length,
    files_total: filesTotal,
    files_missing: filesMissing,
    users_affected: affected.length,
    storage_persistent: !KYC_DIR.includes(`${path.sep}backend${path.sep}`),
    affected,
  });
});

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
  const { status = '' } = req.query;
  let q = `SELECT id, name, email, phone, role, is_admin, COALESCE(banned,0) AS banned, verified, kyc_status, lessor_type, created_at,
    COALESCE(approved,0) AS approved, approval_reason,
    (SELECT COUNT(*) FROM cars c WHERE c.owner_id = u.id) AS car_count
    FROM users u WHERE 1=1`;
  const p = [];
  if (search) { q += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  if (role) { q += ' AND u.role = ?'; p.push(role); }
  if (status === 'pending') q += ' AND COALESCE(u.approved,0) = 0 AND (u.is_admin IS NULL OR u.is_admin = 0)';
  q += ' ORDER BY u.created_at DESC';
  const rows = db.prepare(q).all(...p).map(u => ({ ...u, is_admin: Boolean(u.is_admin), banned: Boolean(u.banned), verified: Boolean(u.verified), approved: Boolean(u.approved) }));
  const pending = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE COALESCE(approved,0) = 0 AND ${NOT_ADMIN}`).get().c;
  res.json({ users: rows, pending });
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
    c.registration_number, c.plate_image, c.carte_grise_image, c.insurance_image,
    u.name AS owner_name, u.kyc_docs AS owner_kyc_docs
    FROM cars c JOIN users u ON c.owner_id = u.id WHERE 1=1`;
  const p = [];
  if (search) { q += ' AND (c.title LIKE ? OR c.brand LIKE ? OR u.name LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  q += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(q).all(...p).map(c => {
    let owner_docs = {};
    try { owner_docs = JSON.parse(c.owner_kyc_docs || '{}'); } catch { owner_docs = {}; }
    const { owner_kyc_docs, ...rest } = c;
    return { ...rest, available: Boolean(c.available), owner_docs };
  }));
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

/* ════════════ Database backups ════════════ */

/* List on-server snapshots */
router.get('/backups', adminAuth, (req, res) => {
  res.json(backup.listBackups());
});

/* Create a snapshot on demand */
router.post('/backups', adminAuth, (req, res) => {
  try {
    const file = backup.backupNow('manual');
    res.status(201).json({ ok: true, name: path.basename(file) });
  } catch (e) {
    res.status(500).json({ error: 'Échec de la sauvegarde : ' + e.message });
  }
});

/* Download a specific snapshot by name */
router.get('/backups/:name', adminAuth, (req, res) => {
  const p = backup.backupPath(req.params.name);
  if (!p) return res.status(404).json({ error: 'Sauvegarde introuvable' });
  res.download(p);
});

/* Download a FRESH snapshot of the live database (the durable, off-server copy).
   Creates a new consistent snapshot, then streams it to the admin's browser. */
router.get('/database/download', adminAuth, (req, res) => {
  try {
    const file = backup.backupNow('download');
    res.download(file, `kricar-${new Date().toISOString().slice(0, 10)}.db`);
  } catch (e) {
    res.status(500).json({ error: 'Échec de la sauvegarde : ' + e.message });
  }
});

/* ── App settings (e.g. DzKricar's commercial-register number for contracts) ── */
router.get('/settings', adminAuth, (req, res) => {
  res.json(settings.all());
});

router.put('/settings', adminAuth, (req, res) => {
  const body = req.body || {};
  const updated = {};
  for (const key of settings.EDITABLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      settings.set(key, body[key]);
      updated[key] = settings.get(key);
    }
  }
  res.json({ ok: true, settings: settings.all() });
});

/* Re-run the showcase seed (wipes + reinserts the 12 demo cars, the 2 demo agencies,
   and the migrated v1 data — real user accounts, bookings and reviews from other
   users are untouched by seed() itself, EXCEPT that the wipe step inside seed()
   deletes ALL reviews/bookings/car_locations/favorites, not just the demo ones, so
   this is a "reset the catalogue to its known-good state" action, not a soft merge.
   Exists because some hosts (e.g. Hostinger) don't expose a way to run `node seed.js`
   by hand — this lets an admin apply a corrected seed.js from the UI instead. Takes
   a snapshot first so it's always reversible via the Sauvegardes tab. */
router.post('/reseed', adminAuth, async (req, res) => {
  try {
    backup.backupNow('pre-reseed');
    await require('../seed').seed();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Échec du reseed : ' + e.message });
  }
});

/* ── Document-expiry alerts ──
   Flags clients whose driving licence is expired or expires within 30 days,
   computed from the stored expiry date (no OCR). */
router.get('/expiring-docs', adminAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, email, phone, driving_license_number, driving_license_expiry_date AS expiry
    FROM users
    WHERE driving_license_expiry_date IS NOT NULL AND driving_license_expiry_date != ''
      AND date(driving_license_expiry_date) <= date('now', '+30 days')
      AND ${NOT_ADMIN}
    ORDER BY driving_license_expiry_date ASC
  `).all();
  const today = new Date().toISOString().slice(0, 10);
  const items = rows.map(u => ({ ...u, expired: u.expiry < today }));
  res.json({
    items,
    expired: items.filter(i => i.expired).length,
    expiring_soon: items.filter(i => !i.expired).length,
  });
});

/* ── Account approval ──
   New sign-ups are pending until an admin approves them. Pending users can log in
   and browse but can't book or publish (enforced in bookings/cars routes). The
   pending list is served by GET /users?status=pending above. */
router.post('/users/:id/approve', adminAuth, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.prepare("UPDATE users SET approved = 1, approval_reason = NULL, approved_at = datetime('now') WHERE id = ?").run(req.params.id);
  notify(req.app.get('io'), req.params.id, {
    type: 'account',
    title: 'Compte validé',
    body: 'Votre compte a été validé. Vous pouvez maintenant réserver et publier.',
    link: '/dashboard',
  });
  res.json({ ok: true, approved: true });
});

router.post('/users/:id/reject', adminAuth, (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.prepare("UPDATE users SET approved = 0, approval_reason = ?, approved_at = datetime('now') WHERE id = ?")
    .run((req.body?.reason || 'Compte refusé par un administrateur.'), req.params.id);
  res.json({ ok: true, approved: false });
});

module.exports = router;
