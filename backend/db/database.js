const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { DB_PATH } = require('../config/paths');

/* DB_PATH persists outside the deploy dir on hosts that wipe it each deploy
   (see config/paths.js). Falls back to backend/db/kricar.db for local dev. */
const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'renter',
    verified INTEGER DEFAULT 0,
    id_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agencies (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    logo TEXT,
    description TEXT,
    wilaya TEXT NOT NULL,
    city TEXT,
    phone TEXT,
    email TEXT,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cars (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    agency_id TEXT REFERENCES agencies(id),
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    type TEXT NOT NULL,
    wilaya TEXT NOT NULL,
    city TEXT,
    price_per_day INTEGER NOT NULL,
    description TEXT,
    features TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    available INTEGER DEFAULT 1,
    verified INTEGER DEFAULT 0,
    seats INTEGER DEFAULT 5,
    transmission TEXT DEFAULT 'manual',
    fuel TEXT DEFAULT 'essence',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    car_id TEXT NOT NULL REFERENCES cars(id),
    renter_id TEXT NOT NULL REFERENCES users(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    car_id TEXT NOT NULL REFERENCES cars(id),
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    booking_id TEXT REFERENCES bookings(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL REFERENCES users(id),
    car_id TEXT NOT NULL REFERENCES cars(id),
    PRIMARY KEY (user_id, car_id)
  );

  CREATE TABLE IF NOT EXISTS car_locations (
    car_id TEXT PRIMARY KEY REFERENCES cars(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

/* Add gps_token column if it doesn't exist (safe to run repeatedly) */
try { db.exec(`ALTER TABLE cars ADD COLUMN gps_token TEXT`); } catch {}
/* Add location shortcut columns on cars for fast queries */
try { db.exec(`ALTER TABLE cars ADD COLUMN lat REAL`); } catch {}
try { db.exec(`ALTER TABLE cars ADD COLUMN lng REAL`); } catch {}
/* Add color column on cars */
try { db.exec(`ALTER TABLE cars ADD COLUMN color TEXT`); } catch {}

/* ── KYC / identity-verification columns on users (idempotent) ── */
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'none'`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN lessor_type TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN document_type TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN document_number TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN driving_license_number TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN driving_license_issued_date TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN driving_license_expiry_date TEXT`); } catch {}
/* ── Expanded agency / manager identity columns (CRICAR 2.0 contracts) ── */
try { db.exec(`ALTER TABLE users ADD COLUMN agency_address TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN national_id_number TEXT`); } catch {}   // NIN (18 digits) of the manager
try { db.exec(`ALTER TABLE users ADD COLUMN agency_legal_name TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN agency_commercial_reg_number TEXT`); } catch {}
/* JSON map of uploaded KYC document file paths */
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_docs TEXT DEFAULT '{}'`); } catch {}

/* ── Admin + KYC review columns (idempotent) ── */
try { db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_rejection_reason TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_reviewed_at TEXT`); } catch {}

/* ── Admin approval of new accounts (idempotent) ──
   New sign-ups start pending (approved = 0) and can browse but not book/publish
   until an admin approves. Existing users (and admins) are backfilled to approved
   so the new gate never locks out anyone who registered before it existed. */
try {
  db.exec(`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0`);
  db.exec(`UPDATE users SET approved = 1`);            // backfill everyone already registered
} catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN approval_reason TEXT`); } catch {}   // reason if rejected
try { db.exec(`ALTER TABLE users ADD COLUMN approved_at TEXT`); } catch {}
try { db.exec(`UPDATE users SET approved = 1 WHERE is_admin = 1`); } catch {}     // admins always approved

/* ── Email verification + password recovery (Feature 11, idempotent) ──
   Tokens are stored as SHA-256 hashes; the raw token only travels in the email link. */
try { db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN email_verify_token TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN email_verify_expires TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN password_reset_token TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN password_reset_expires TEXT`); } catch {}

/* Security audit log: every verify/reset event is recorded (the doc requires it). */
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    type TEXT NOT NULL,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ── Rental-terms columns on cars (idempotent) ── */
try { db.exec(`ALTER TABLE cars ADD COLUMN caution INTEGER`); } catch {}           // security deposit (DA), refunded if no damage
try { db.exec(`ALTER TABLE cars ADD COLUMN km_per_day INTEGER`); } catch {}        // mileage allowance per day
try { db.exec(`ALTER TABLE cars ADD COLUMN extra_km_price INTEGER`); } catch {}    // price per extra km (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN with_driver INTEGER DEFAULT 0`); } catch {} // 1 = avec chauffeur, 0 = sans chauffeur
try { db.exec(`ALTER TABLE cars ADD COLUMN weekly_price INTEGER`); } catch {}      // optional weekly rate (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN monthly_price INTEGER`); } catch {}     // optional monthly rate (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN video_url TEXT`); } catch {}            // uploaded video path or YouTube / mp4 link
try { db.exec(`ALTER TABLE cars ADD COLUMN views INTEGER DEFAULT 0`); } catch {}   // detail-page view counter
/* Hourly rental support: rent_mode = daily | hourly | both */
try { db.exec(`ALTER TABLE cars ADD COLUMN price_per_hour INTEGER`); } catch {}    // optional hourly rate (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN rent_mode TEXT DEFAULT 'daily'`); } catch {}
try { db.exec(`UPDATE cars SET rent_mode = 'daily' WHERE rent_mode IS NULL`); } catch {}

/* Backfill sensible defaults so existing/seeded cars surface the new sections */
try {
  db.exec(`UPDATE cars SET caution = price_per_day * 3 WHERE caution IS NULL`);
  db.exec(`UPDATE cars SET km_per_day = 200 WHERE km_per_day IS NULL`);
  db.exec(`UPDATE cars SET extra_km_price = 20 WHERE extra_km_price IS NULL`);
  db.exec(`UPDATE cars SET views = 0 WHERE views IS NULL`);
} catch {}

/* ── Agency catalog columns (idempotent) ── */
try { db.exec(`ALTER TABLE agencies ADD COLUMN agency_type TEXT DEFAULT 'classic'`); } catch {} // classic | luxury | wedding | trucks
try { db.exec(`ALTER TABLE agencies ADD COLUMN cover TEXT`); } catch {}                          // banner image url
/* Photo gallery (fleet / premises) shown on the public agency page — JSON array of paths */
try { db.exec(`ALTER TABLE agencies ADD COLUMN gallery TEXT DEFAULT '[]'`); } catch {}
try { db.exec(`UPDATE agencies SET agency_type = 'classic' WHERE agency_type IS NULL`); } catch {}

/* Car registration plate — printed on rental contracts (idempotent) */
try { db.exec(`ALTER TABLE cars ADD COLUMN registration_number TEXT`); } catch {}

/* ── Client "final updates": mandatory car documents (idempotent) ──
   plate_image is public (shown on the listing); carte_grise_image and
   insurance_image are sensitive and served only through an auth-gated route. */
try { db.exec(`ALTER TABLE cars ADD COLUMN plate_image TEXT`); } catch {}          // license-plate photo (public)
try { db.exec(`ALTER TABLE cars ADD COLUMN carte_grise_image TEXT`); } catch {}    // gray card (private)
try { db.exec(`ALTER TABLE cars ADD COLUMN insurance_image TEXT`); } catch {}      // insurance document (private)

/* Availability with an optional end date: a car is available only when
   available = 1 AND (unavailable_until IS NULL OR in the past). */
try { db.exec(`ALTER TABLE cars ADD COLUMN unavailable_until TEXT`); } catch {}    // ISO date the car is unavailable until

/* ── Handover documentation on bookings (check-in / check-out, idempotent) ──
   The owner records a video + odometer reading before delivery and after return;
   distance = checkout_km - checkin_km. Referenced in the rental contract. */
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkin_video TEXT`); } catch {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkin_km INTEGER`); } catch {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkin_at TEXT`); } catch {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkout_video TEXT`); } catch {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkout_km INTEGER`); } catch {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN checkout_at TEXT`); } catch {}

/* ── App settings (key/value) ──
   Admin-editable values that must change without a code deploy — e.g. KriCar's own
   commercial-register number printed inside the electronic-contract stamp/QR. */
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ── Electronic contracts (CRICAR 2.0) ──
   type:   'partnership' (KriCar ↔ agency) | 'rental' (client ↔ agency)
   data:   JSON snapshot of every party/vehicle field at issue time (immutable)
   qr_token: opaque token embedded in the QR code for public verification */
db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    contract_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    booking_id TEXT REFERENCES bookings(id),
    agency_owner_id TEXT REFERENCES users(id),
    renter_id TEXT REFERENCES users(id),
    data TEXT NOT NULL,
    qr_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ── Legal: versioned terms & conditions ──
   One row per published version, holding the text in all three languages so the
   exact wording a user accepted can always be reproduced. */
db.exec(`
  CREATE TABLE IF NOT EXISTS terms_versions (
    id TEXT PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    content_fr TEXT,
    content_ar TEXT,
    content_en TEXT,
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    published_at TEXT
  );
`);

/* ── Legal: consent audit trail ──
   Every acceptance (signup, booking, re-acceptance after a new version) is kept
   with the evidence needed in a dispute: who, which version, when, from where. */
db.exec(`
  CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    terms_version TEXT NOT NULL,
    context TEXT NOT NULL,
    booking_id TEXT REFERENCES bookings(id),
    ip TEXT,
    user_agent TEXT,
    lang TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);
  CREATE INDEX IF NOT EXISTS idx_consents_booking ON consents(booking_id);
`);

/* Which terms version each user has accepted (for forced re-acceptance). */
try { db.exec(`ALTER TABLE users ADD COLUMN terms_version TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN terms_accepted_at TEXT`); } catch {}

/* ── In-app notifications ──
   Delivered live over Socket.io to the user's personal room and persisted so the
   bell shows history + unread count across sessions. */
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
`);

/* Online signatures (griffes) drawn by each party — JSON:
   { agency: {image,name,signed_at}, client: {...}, kricar: {...} } (idempotent) */
try { db.exec(`ALTER TABLE contracts ADD COLUMN signatures TEXT DEFAULT '{}'`); } catch {}

module.exports = db;
