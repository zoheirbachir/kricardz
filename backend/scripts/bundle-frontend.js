/* Builds the frontend and copies the output INSIDE backend/public.
   Why: some hosts (e.g. Hostinger's Node.js git-deploy) only deploy the backend/
   folder as the Node app's root — a sibling ../frontend/dist never exists there.
   By bundling the built site inside backend/ itself, one deploy always carries
   its own frontend with it, with no dependency on a second deploy succeeding.

   Usage: node backend/scripts/bundle-frontend.js   (or `npm run bundle:frontend`)
   Run this locally before pushing whenever the frontend changes and you deploy
   to a host that only pulls in backend/. */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRONTEND = path.join(__dirname, '../../frontend');
const DIST = path.join(FRONTEND, 'dist');
const PUBLIC = path.join(__dirname, '../public');

console.log('Building frontend...');
execSync('npm run build', { cwd: FRONTEND, stdio: 'inherit' });

if (!fs.existsSync(DIST)) {
  console.error('Build did not produce frontend/dist — aborting.');
  process.exit(1);
}

console.log('Copying frontend/dist -> backend/public...');
fs.rmSync(PUBLIC, { recursive: true, force: true });
fs.cpSync(DIST, PUBLIC, { recursive: true });

console.log('Done. backend/public is ready to deploy.');
