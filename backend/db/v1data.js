/* ── v1 → v2 data migration ──
   Merges the original CRICAR MySQL export (u228904793_kricar123.sql) into the
   new SQLite schema. Called from seed.js AFTER the main seed so it augments the
   12 showcase cars instead of replacing them.

   Notes:
   - Passwords are kept as their original bcrypt hashes ($2a/$2y) — bcryptjs
     verifies both, so v1 users log in with their real passwords (by phone or email).
   - v1 admin (id 1, phone 0553636834) is skipped: the new admin already uses
     0553636834 / 0553636834 as required.
   - v1 vehicle 3 (Fiat 500) is already in the main seed, owned by Badidi, so only
     v1 vehicle 4 (Toyota) is added here. Its main image is served from the CDN.
*/

const CDN = 'https://kricar-dz.com/uploads/vehicles/';

/* province_id → wilaya name (standard Algerian numbering) */
const WILAYA = { 5: 'Batna', 11: 'Tamanrasset', 16: 'Alger', 31: 'Oran', 40: 'Khenchela' };

/* v1 users (id 1 admin intentionally omitted). match_phone → update existing seed
   account; otherwise inserted fresh with a deterministic id. */
const USERS = [
  { v1: 4, match_phone: '0673590224', pass: '$2a$12$49QAeSnjeZiVEgsU7fakCeP5cxYWknwDjsfsM5pJbi0iPY.HYMQky',
    name: 'Badidi bouda islam', role: 'owner', lessor_type: 'individual', kyc: 'approved', dl: null },
  { v1: 5, id: 'v1-user-5', email: '0666666666@v1.kricar.dz', phone: '0666666666', pass: '$2y$10$MvLM6K4saejoInVmor2QeuvGh5J3kG5acHRXCCntILHZ.hsHGmqDC',
    name: 'test', role: 'owner', lessor_type: 'agency', kyc: 'pending', agency: 'test', reg: '0666666666', province: 11 },
  { v1: 6, id: 'v1-user-6', email: '0663614442@v1.kricar.dz', phone: '0663614442', pass: '$2y$10$U2suSJ0qQ.DhRgzhyWXrzuUB3l.OI3JkYjkhzkW38GISDSZ9uRq/y',
    name: 'Hani test', role: 'owner', lessor_type: 'agency', kyc: 'approved', agency: 'Hani test', reg: '202222', province: 40 },
  { v1: 7, id: 'v1-user-7', email: 'lemsibadox@gmail.dz', phone: '0555667788', pass: '$2y$10$UGMcH65GcwdhL0gsjOhHHewbI9LgRhE/Pl82MhOyfeC4RIrP9j0Xa',
    name: 'Djamel djamel', role: 'renter', dl: '2019-04-17' },
  { v1: 8, id: 'v1-user-8', email: '0777777777@v1.kricar.dz', phone: '0777777777', pass: '$2y$10$Ysn6/tu1JMb5qV3dtLmcVeEG3NsyDSkBqoCIBVU4PSZq5C2WlZI9S',
    name: 'hani', role: 'renter', dl: '2023-04-24' },
  { v1: 9, id: 'v1-user-9', email: '0688888888@v1.kricar.dz', phone: '0688888888', pass: '$2y$10$9XxZ5q63Yl1AvyiSF18ICOLVR/LbsdfrBIyk1fvApXpKlv8EvWgz.',
    name: 'SAHRA', role: 'owner', lessor_type: 'agency', kyc: 'pending', agency: 'HANI', reg: '9999999', province: 11 },
];

function seedV1(db) {
  const idByV1 = {}; // v1 numeric id → new user id

  for (const u of USERS) {
    const kycOk = u.kyc === 'approved' ? 1 : 0;
    if (u.match_phone) {
      /* Existing seed account (Badidi) — bring in the real password + KYC. */
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(u.match_phone);
      if (existing) {
        db.prepare(`UPDATE users SET password_hash = ?, kyc_status = ?, verified = 1, id_verified = 1,
          lessor_type = COALESCE(lessor_type, ?) WHERE id = ?`).run(u.pass, u.kyc, u.lessor_type || null, existing.id);
        idByV1[u.v1] = existing.id;
      }
      continue;
    }
    db.prepare(`INSERT OR IGNORE INTO users
      (id, email, password_hash, name, phone, role, verified, id_verified, email_verified,
       kyc_status, lessor_type, driving_license_issued_date, agency_legal_name, agency_commercial_reg_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`).run(
      u.id, u.email, u.pass, u.name, u.phone, u.role, kycOk, kycOk,
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

  /* v1 vehicle 4 — Toyota col (main image lives on the CDN; the video is gone). */
  if (idByV1[6]) {
    db.prepare(`INSERT OR IGNORE INTO cars
      (id, owner_id, agency_id, title, brand, model, year, type, wilaya, city, price_per_day, description,
       features, images, seats, transmission, fuel, caution, km_per_day, extra_km_price, with_driver,
       video_url, available, verified, registration_number, views, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`).run(
      'v1-car-4', idByV1[6], 'v1-agency-6', 'Toyota col 2006', 'Toyota', 'col', 2006, 'sport',
      WILAYA[40], WILAYA[40], 1000, 'تاست',
      '[]', JSON.stringify([CDN + '69e248df47484_1776437471.jpg']),
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
