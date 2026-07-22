/* Load .env if dotenv is installed (production). Optional so local dev runs without it. */
try { require('dotenv').config(); } catch { /* dotenv not installed — env comes from the shell/PM2 */ }

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');
const JWT_SECRET = require('./config/secret');
const { canTrackCar } = require('./lib/tracking');
const db = require('./db/database');

const app = express();
const server = http.createServer(app);

/* In production set CORS_ORIGIN to your web domain(s), comma-separated, e.g.
   CORS_ORIGIN="https://kricar-dz.com,https://www.kricar-dz.com". Defaults to "*".

   The Android/iOS app is ALWAYS allowed on top of that, regardless of CORS_ORIGIN —
   Capacitor apps call the API from their own webview origin (capacitor://localhost
   on iOS, https://localhost with androidScheme:"https" on Android, per
   frontend/capacitor.config.json), which has nothing to do with the web domain.
   Locking CORS_ORIGIN to just the website would otherwise silently break every
   request from the mobile app. */
const MOBILE_APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'ionic://localhost'];
const configuredOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : null;

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / server-to-server / curl (no Origin header)
  if (!configuredOrigins) return true; // no restriction configured -> allow all (dev default)
  if (configuredOrigins.includes('*')) return true;
  return configuredOrigins.includes(origin) || MOBILE_APP_ORIGINS.includes(origin);
}
const corsOriginFn = (origin, callback) => callback(null, isAllowedOrigin(origin));

const io = new Server(server, {
  cors: { origin: corsOriginFn, methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

/* Security headers. CSP is disabled because the SPA loads external fonts, map tiles
   and CDN images; CORP is cross-origin so the mobile app can embed /uploads media. */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: corsOriginFn }));
app.use(express.json());
app.use('/uploads', express.static(require('./config/paths').UPLOADS_ROOT));

/* Make io accessible in route handlers */
app.set('io', io);

/* Socket.io: a client may only join a car's live-tracking room if its token
   authorizes it (owner / active renter / admin). The token is passed via
   io(url, { auth: { token } }) on the client. */
io.on('connection', (socket) => {
  /* Join the user's personal room so we can push notifications to them. */
  try {
    const uid = jwt.verify(socket.handshake.auth?.token || '', JWT_SECRET).id;
    if (uid) socket.join(`user:${uid}`);
  } catch { /* anonymous socket — tracking only */ }

  socket.on('track:car', (carId) => {
    let userId = null;
    try { userId = jwt.verify(socket.handshake.auth?.token || '', JWT_SECRET).id; } catch { userId = null; }
    if (!canTrackCar(userId, carId)) {
      socket.emit('track:denied', { car_id: carId });
      return;
    }
    socket.join(`car:${carId}`);
  });
  socket.on('untrack:car', (carId) => {
    socket.leave(`car:${carId}`);
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/agencies', require('./routes/agencies'));
app.use('/api/location', require('./routes/locations'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/terms', require('./routes/terms'));

app.get('/api/wilayas', (req, res) => {
  res.json([
    'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
    'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
    'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
    'Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran','El Bayadh',
    'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued',
    'Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
    'Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Béni Abbès',
    'In Salah','In Guezzam','Touggourt','Djanet','M\'Ghair','El Meniaa'
  ]);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

/* ── Serve the built React app (production single-origin deploy) ──
   Two possible locations, checked in order:
   1. backend/public  — the frontend build copied INSIDE backend/ (see
      backend/scripts/bundle-frontend.js). Use this when the host only deploys
      the backend/ folder as its own app root (e.g. Hostinger's Node.js git-deploy),
      so a single deploy always carries its own frontend with it.
   2. ../frontend/dist — a sibling folder, when the whole repo is deployed together
      (e.g. Render) and `npm run build` was run in frontend/ directly.
   If neither exists, this block stays dormant and only the API is served. */
const distPath = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  /* SPA fallback: send index.html for any non-API, non-asset GET so client-side
     routing (e.g. /search, /agencies) works on hard refresh. */
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Serving frontend build from', distPath);
}

/* On hosts where we can't easily run `node seed.js` once by hand (e.g. Hostinger's
   Node app manager, whose Node binary isn't on the SSH PATH), run it automatically
   — but ONLY when the cars table is empty. This seeds a brand-new deployment once
   and never again, so it can't wipe real bookings/reviews on a later restart. */
async function ensureSeeded() {
  try {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM cars').get();
    if (n === 0) {
      console.log('No cars found — running the initial seed...');
      await require('./seed').seed();
      console.log('Initial seed complete.');
    }
  } catch (e) {
    console.error('Auto-seed check failed (server will still start):', e.message);
  }
}

(async () => {
  await ensureSeeded();
  /* Always have terms in force so signup/booking consent can reference a version. */
  try { require('./lib/legal').ensureSeeded(); } catch (e) { console.error('terms seed failed:', e.message); }
  server.listen(PORT, () => {
    console.log(`DzKricar API + Socket.io running on port ${PORT}`);
    /* Periodic + on-shutdown database snapshots (best-effort; never crashes the server). */
    try { require('./lib/backup').startAutoBackups(); } catch (e) { console.error('backup init failed:', e.message); }
  });
})();
