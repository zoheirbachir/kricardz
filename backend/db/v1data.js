/* ── v1 → v2 data migration ──
   Merges the original CRICAR MySQL export into the new SQLite schema. Called from
   seed.js AFTER the main seed so it augments the 12 showcase cars.

   Passwords: the original bcrypt hashes are NOT stored in this (public) repo.
   Supply them — optionally — via the V1_PASSWORD_HASHES env var as JSON
   {"<phone>":"<bcrypt-hash>"} so migrated users keep their old passwords. Without
   it, each migrated account gets a random password and the user regains access via
   the "forgot password" flow (which is the right thing to do anyway, since the old
   hashes were previously exposed in git history). */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const WILAYA = { 5: 'Batna', 11: 'Tamanrasset', 16: 'Alger', 31: 'Oran', 40: 'Khenchela' };

let ENV_HASHES = {};
try { ENV_HASHES = JSON.parse(process.env.V1_PASSWORD_HASHES || '{}'); } catch { ENV_HASHES = {}; }
const randomHash = () => bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 10);

/* `existing: true` → match an already-seeded account by phone and update it.
   Everyone else is inserted fresh with a deterministic id. */
const USERS = [
  { v1: 4, phone: '0673590224', existing: true, name: 'Badidi bouda islam', role: 'owner', lessor_type: 'individual', kyc: 'approved' },
  { v1: 5, id: 'v1-user-5', phone: '0666666666', email: '0666666666@v1.kricar.dz', name: 'test', role: 'owner', lessor_type: 'agency', kyc: 'pending', agency: 'test', reg: '0666666666', province: 11 },
  { v1: 6, id: 'v1-user-6', phone: '0663614442', email: '0663614442@v1.kricar.dz', name: 'Hani test', role: 'owner', lessor_type: 'agency', kyc: 'approved', agency: 'Hani test', reg: '202222', province: 40 },
  { v1: 7, id: 'v1-user-7', phone: '0555667788', email: 'lemsibadox@gmail.dz', name: 'Djamel djamel', role: 'renter', dl: '2019-04-17' },
  { v1: 8, id: 'v1-user-8', phone: '0777777777', email: '0777777777@v1.kricar.dz', name: 'hani', role: 'renter', dl: '2023-04-24' },
  { v1: 9, id: 'v1-user-9', phone: '0688888888', email: '0688888888@v1.kricar.dz', name: 'SAHRA', role: 'owner', lessor_type: 'agency', kyc: 'pending', agency: 'HANI', reg: '9999999', province: 11 },
];

function seedV1(db) {
  const idByV1 = {}; // v1 numeric id → new user id

  for (const u of USERS) {
    const kycOk = u.kyc === 'approved' ? 1 : 0;
    const envHash = ENV_HASHES[u.phone];

    if (u.existing) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(u.phone);
      if (existing) {
        /* Only reset the password if the real v1 hash was supplied via env;
           otherwise leave whatever the main seed set. */
        if (envHash) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(envHash, existing.id);
        db.prepare(`UPDATE users SET kyc_status = ?, verified = 1, id_verified = 1,
          lessor_type = COALESCE(lessor_type, ?) WHERE id = ?`).run(u.kyc, u.lessor_type || null, existing.id);
        idByV1[u.v1] = existing.id;
      }
      continue;
    }

    db.prepare(`INSERT OR IGNORE INTO users
      (id, email, password_hash, name, phone, role, verified, id_verified, email_verified,
       kyc_status, lessor_type, driving_license_issued_date, agency_legal_name, agency_commercial_reg_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`).run(
      u.id, u.email, envHash || randomHash(), u.name, u.phone, u.role, kycOk, kycOk,
      u.kyc || 'pending', u.lessor_type || null, u.dl || null, u.agency || null, u.reg || null
    );
    idByV1[u.v1] = u.id;
  }

  /* Agencies for the agency-type lessors, so they surface on the agencies page. */
  const agencies = [
    { id: 'v1-agency-5', owner: idByV1[5], name: 'test',      wilaya: WILAYA[11], phone: '0666666666', verified: 0 },
    { id: 'v1-agency-6', owner: idByV1[6], name: 'Hani test', wilaya: WILAYA[40], phone: '0663614442', verified: 1 },
    { id: 'v1-agency-9', owner: idByV1[9], name: 'HANI',      wilaya: WILAYA[11], phone: '0688888888', verified: 0 },
  ];
  for (const a of agencies) {
    if (!a.owner) continue;
    db.prepare(`INSERT OR IGNORE INTO agencies (id, owner_id, name, wilaya, city, phone, agency_type, verified)
      VALUES (?, ?, ?, ?, ?, ?, 'classic', ?)`).run(a.id, a.owner, a.name, a.wilaya, a.wilaya, a.phone, a.verified);
  }

  /* v1 vehicle 4 — Toyota col. No photo/video: the original files lived on the old
     kricar-dz.com site, which this app has since replaced on that same domain. */
  if (idByV1[6]) {
    db.prepare(`INSERT OR IGNORE INTO cars
      (id, owner_id, agency_id, title, brand, model, year, type, wilaya, city, price_per_day, description,
       features, images, seats, transmission, fuel, caution, km_per_day, extra_km_price, with_driver,
       video_url, available, verified, registration_number, views, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`).run(
      'v1-car-4', idByV1[6], 'v1-agency-6', 'Toyota col 2006', 'Toyota', 'col', 2006, 'sport',
      WILAYA[40], WILAYA[40], 1000, 'تاست',
      '[]', '[]',
      5, 'manual', 'essence', 20000, 300, 10, 1,
      null, '', 25, '2026-04-17 14:51:11'
    );
  }

  /* The 2 original bookings: Hani test rented Badidi's Fiat 500 (already seeded). */
  const badidiId = idByV1[4];
  const haniId = idByV1[6];
  if (badidiId && haniId) {
    const fiat = db.prepare(`SELECT id FROM cars WHERE owner_id = ? AND title = 'Fiat 500' LIMIT 1`).get(badidiId);
    if (fiat) {
      const bookings = [
        { id: 'v1-booking-1', start: '2026-04-28', end: '2026-04-29', total: 14000, created: '2026-04-28 08:19:51' },
        { id: 'v1-booking-2', start: '2026-05-26', end: '2026-05-27', total: 14000, created: '2026-05-26 10:25:04' },
      ];
      for (const b of bookings) {
        db.prepare(`INSERT OR IGNORE INTO bookings (id, car_id, renter_id, start_date, end_date, total_price, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`).run(b.id, fiat.id, haniId, b.start, b.end, b.total, b.created);
      }
    }
  }

  console.log('v1 data merged (users, agencies, Toyota, bookings).');
}

module.exports = { seedV1 };
