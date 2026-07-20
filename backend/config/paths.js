const path = require('path');
const fs = require('fs');

/* Where uploaded media lives.

   By default it sits inside the app at backend/uploads. On hosts that replace
   the whole app directory on every deploy (e.g. Hostinger's git deploy), that
   folder — being gitignored — gets wiped on each deploy, so uploaded photos
   disappear. Set UPLOADS_ROOT to a path OUTSIDE the deploy directory (e.g.
   /home/<user>/kricar-uploads) and the media then survives every redeploy.

   The public path stays /uploads/vehicles/... regardless of where this points. */
const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(__dirname, '..', 'uploads');

const VEHICLES_DIR = path.join(UPLOADS_ROOT, 'vehicles');
/* Handover (check-in / check-out) videos — public path /uploads/handover/... */
const HANDOVER_DIR = path.join(UPLOADS_ROOT, 'handover');
/* Agency gallery photos — public path /uploads/agencies/... */
const AGENCIES_DIR = path.join(UPLOADS_ROOT, 'agencies');

/* Private docs (KYC, car papers) are served through auth-gated routes, never
   statically. They must ALSO survive redeploys, so when UPLOADS_ROOT points at a
   persistent folder outside the deploy dir, default the private root to a SIBLING
   of it (never inside UPLOADS_ROOT, which is served statically). Falls back to the
   in-app folder for local dev. Can still be overridden with PRIVATE_UPLOADS_ROOT. */
const PRIVATE_UPLOADS_ROOT = process.env.PRIVATE_UPLOADS_ROOT
  ? path.resolve(process.env.PRIVATE_UPLOADS_ROOT)
  : (process.env.UPLOADS_ROOT
      ? path.join(path.dirname(UPLOADS_ROOT), 'kricar-private')
      : path.join(__dirname, '..', 'private_uploads'));
/* Sensitive car documents (carte grise, insurance) — owner/admin only. */
const CAR_DOCS_DIR = path.join(PRIVATE_UPLOADS_ROOT, 'car_docs');

/* The SQLite database file. It MUST live outside the deploy directory, or every
   redeploy wipes it and all accounts/bookings are lost. When UPLOADS_ROOT points
   at a persistent folder, default the DB to a sibling too. Overridable with
   DB_PATH; local dev keeps it in backend/db. */
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : (process.env.UPLOADS_ROOT
      ? path.join(path.dirname(UPLOADS_ROOT), 'kricar-data', 'kricar.db')
      : path.join(__dirname, '..', 'db', 'kricar.db'));

/* Make sure the directories exist so a freshly-pointed UPLOADS_ROOT works. */
for (const dir of [VEHICLES_DIR, HANDOVER_DIR, AGENCIES_DIR, PRIVATE_UPLOADS_ROOT, CAR_DOCS_DIR, path.dirname(DB_PATH)]) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
}

module.exports = { UPLOADS_ROOT, VEHICLES_DIR, HANDOVER_DIR, AGENCIES_DIR, PRIVATE_UPLOADS_ROOT, CAR_DOCS_DIR, DB_PATH };
