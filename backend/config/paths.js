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

/* Private docs are served through auth-gated routes, never statically. */
const PRIVATE_UPLOADS_ROOT = process.env.PRIVATE_UPLOADS_ROOT
  ? path.resolve(process.env.PRIVATE_UPLOADS_ROOT)
  : path.join(__dirname, '..', 'private_uploads');
/* Sensitive car documents (carte grise, insurance) — owner/admin only. */
const CAR_DOCS_DIR = path.join(PRIVATE_UPLOADS_ROOT, 'car_docs');

/* Make sure the directories exist so a freshly-pointed UPLOADS_ROOT works. */
for (const dir of [VEHICLES_DIR, HANDOVER_DIR, PRIVATE_UPLOADS_ROOT, CAR_DOCS_DIR]) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
}

module.exports = { UPLOADS_ROOT, VEHICLES_DIR, HANDOVER_DIR, PRIVATE_UPLOADS_ROOT, CAR_DOCS_DIR };
