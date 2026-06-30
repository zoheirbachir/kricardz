/* Load .env if dotenv is installed (production). Optional so local dev runs without it. */
try { require('dotenv').config(); } catch { /* dotenv not installed — env comes from the shell/PM2 */ }

const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

/* In production set CORS_ORIGIN to your domain(s), comma-separated, e.g.
   CORS_ORIGIN="https://kricar.dz,https://www.kricar.dz". Defaults to "*". */
const ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*';

const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set — using the insecure default. Set it in production.');
}

app.use(cors({ origin: ORIGIN }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* Make io accessible in route handlers */
app.set('io', io);

/* Socket.io: clients join a room per car they want to track */
io.on('connection', (socket) => {
  socket.on('track:car', (carId) => {
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
   Run `npm run build` in ../frontend first. If you serve the SPA with Nginx
   instead, this block simply stays dormant (no dist folder = skipped). */
const distPath = path.join(__dirname, '../frontend/dist');
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

server.listen(PORT, () => console.log(`KriCar API + Socket.io running on port ${PORT}`));
