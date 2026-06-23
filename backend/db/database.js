const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'kricar.db');
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

/* ── KYC / identity-verification columns on users (idempotent) ── */
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'none'`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN lessor_type TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN document_type TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN document_number TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN driving_license_issued_date TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN driving_license_expiry_date TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN agency_legal_name TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN agency_commercial_reg_number TEXT`); } catch {}
/* JSON map of uploaded KYC document file paths */
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_docs TEXT DEFAULT '{}'`); } catch {}

/* ── Admin + KYC review columns (idempotent) ── */
try { db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_rejection_reason TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN kyc_reviewed_at TEXT`); } catch {}

/* ── Rental-terms columns on cars (idempotent) ── */
try { db.exec(`ALTER TABLE cars ADD COLUMN caution INTEGER`); } catch {}           // security deposit (DA), refunded if no damage
try { db.exec(`ALTER TABLE cars ADD COLUMN km_per_day INTEGER`); } catch {}        // mileage allowance per day
try { db.exec(`ALTER TABLE cars ADD COLUMN extra_km_price INTEGER`); } catch {}    // price per extra km (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN with_driver INTEGER DEFAULT 0`); } catch {} // 1 = avec chauffeur, 0 = sans chauffeur
try { db.exec(`ALTER TABLE cars ADD COLUMN weekly_price INTEGER`); } catch {}      // optional weekly rate (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN monthly_price INTEGER`); } catch {}     // optional monthly rate (DA)
try { db.exec(`ALTER TABLE cars ADD COLUMN video_url TEXT`); } catch {}            // optional YouTube / mp4 link
try { db.exec(`ALTER TABLE cars ADD COLUMN views INTEGER DEFAULT 0`); } catch {}   // detail-page view counter

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
try { db.exec(`UPDATE agencies SET agency_type = 'classic' WHERE agency_type IS NULL`); } catch {}

module.exports = db;
