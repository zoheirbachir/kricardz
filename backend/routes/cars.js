const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { makeUploader, uploadErrorHandler, CAR_UPLOAD_TYPES, DOC_FIELDS } = require('../lib/uploads');
const { UPLOADS_ROOT, VEHICLES_DIR, CAR_DOCS_DIR } = require('../config/paths');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/secret');
const { notifyAdmins } = require('../lib/notify');
const { cleanCategory } = require('../lib/serviceTypes');

const router = express.Router();

/* Car media: photos on `images`, a clip on `video`, plus the required documents.
   Listing photos (images, plate_image) go to the public VEHICLES_DIR; sensitive
   documents (carte_grise_image, insurance_image) go to the private CAR_DOCS_DIR,
   served only through the auth-gated /doc-file route. 60MB/file for phone clips. */
const upload = makeUploader({
  dirFor: (file) => (DOC_FIELDS.includes(file.fieldname) ? CAR_DOCS_DIR : VEHICLES_DIR),
  allow: CAR_UPLOAD_TYPES,
  maxMB: 60,
});
const carMedia = upload.fields([
  { name: 'images', maxCount: 8 },
  { name: 'video', maxCount: 1 },
  { name: 'plate_image', maxCount: 1 },
  { name: 'carte_grise_image', maxCount: 1 },
  { name: 'insurance_image', maxCount: 1 },
]);

/* Delete a private car document referenced by its /api/cars/doc-file/<name> path. */
function removePrivateDoc(publicPath) {
  if (!publicPath) return;
  const name = String(publicPath).split('/').pop();
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return;
  const abs = path.join(CAR_DOCS_DIR, name);
  if (!abs.startsWith(CAR_DOCS_DIR)) return;
  fs.unlink(abs, () => {});
}

/* Delete an uploaded media file referenced by its public /uploads/... path
   (best-effort; only touches files inside our own uploads dir). */
function removeUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return; // ignore external URLs (YouTube etc.)
  // Map the public /uploads/... path onto the real (possibly external) uploads root.
  const abs = path.join(UPLOADS_ROOT, publicPath.replace(/^\/uploads\//, ''));
  if (!abs.startsWith(UPLOADS_ROOT)) return; // never escape the uploads dir
  fs.unlink(abs, () => {});
}

/* A car is bookable only when the owner marked it available AND it isn't inside
   an "unavailable until [date]" window. */
function isCurrentlyAvailable(car) {
  if (!car.available) return false;
  if (car.unavailable_until) {
    const until = new Date(car.unavailable_until);
    if (!isNaN(until) && until > new Date()) return false;
  }
  return true;
}

function parseCar(car) {
  if (!car) return null;
  return {
    ...car,
    features: JSON.parse(car.features || '[]'),
    images: JSON.parse(car.images || '[]'),
    available: Boolean(car.available),
    currently_available: isCurrentlyAvailable(car),
    verified: Boolean(car.verified),
    with_driver: Boolean(car.with_driver),
  };
}

/* Count a car view at most once per IP+car per 30 min, so refreshes/bots can't
   inflate the counter (and we don't write to the DB on every single hit). */
const VIEW_TTL = 30 * 60 * 1000;
const viewSeen = new Map();
function shouldCountView(ip, carId) {
  const key = `${ip}:${carId}`;
  const now = Date.now();
  const last = viewSeen.get(key);
  if (last && now - last < VIEW_TTL) return false;
  viewSeen.set(key, now);
  if (viewSeen.size > 5000) { // opportunistic cleanup to bound memory
    for (const [k, t] of viewSeen) if (now - t > VIEW_TTL) viewSeen.delete(k);
  }
  return true;
}

router.get('/', optionalAuth, (req, res) => {
  const { wilaya, type, category, min_price, max_price, search, include_unavailable, limit = 20, offset = 0 } = req.query;
  /* The public catalog (like kricar-dz.com/search) lists unavailable cars too, with a badge.
     Other callers (e.g. the homepage) omit this flag and only get available cars. */
  const showAll = include_unavailable === '1' || include_unavailable === 'true';

  /* Build the WHERE clause once so the list query and the total count stay in sync.
     "Available only" also excludes cars inside an unavailable-until window. */
  const conditions = [showAll ? '1=1' : "(c.available = 1 AND (c.unavailable_until IS NULL OR c.unavailable_until <= date('now')))"];
  const whereParams = [];
  if (wilaya) { conditions.push('c.wilaya = ?'); whereParams.push(wilaya); }
  if (type) { conditions.push('c.type = ?'); whereParams.push(type); }
  if (category) { conditions.push('c.category = ?'); whereParams.push(category); }
  if (min_price) { conditions.push('c.price_per_day >= ?'); whereParams.push(Number(min_price)); }
  if (max_price) { conditions.push('c.price_per_day <= ?'); whereParams.push(Number(max_price)); }
  if (search) { conditions.push('(c.title LIKE ? OR c.brand LIKE ? OR c.model LIKE ?)'); const s = `%${search}%`; whereParams.push(s, s, s); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  /* Available cars first, then unavailable — mirrors the live site's ordering */
  const listQuery = `SELECT c.*, u.name as owner_name, u.avatar as owner_avatar, u.verified as owner_verified
    FROM cars c JOIN users u ON c.owner_id = u.id ${where}
    ORDER BY c.available DESC, c.created_at DESC LIMIT ? OFFSET ?`;

  const cars = db.prepare(listQuery).all(...whereParams, Number(limit), Number(offset)).map(parseCar);
  const total = db.prepare(`SELECT COUNT(*) as count FROM cars c ${where}`).get(...whereParams).count;

  for (const car of cars) {
    const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE car_id = ?').get(car.id);
    car.rating_avg = stats.avg ? Math.round(stats.avg * 10) / 10 : null;
    car.rating_count = stats.count;
  }

  res.json({ cars, total });
});

router.get('/my', auth, (req, res) => {
  const cars = db.prepare('SELECT * FROM cars WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id).map(parseCar);
  res.json(cars);
});

router.get('/:id', optionalAuth, (req, res) => {
  const car = db.prepare('SELECT c.*, u.name as owner_name, u.avatar as owner_avatar, u.phone as owner_phone, u.verified as owner_verified, u.id_verified as owner_id_verified FROM cars c JOIN users u ON c.owner_id = u.id WHERE c.id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });

  /* Increment the view counter — skip the owner's own visits and de-dupe per IP
     (best-effort, never fail the request on error). */
  const isOwnerViewing = req.user && req.user.id === car.owner_id;
  if (!isOwnerViewing && shouldCountView(req.ip || 'anon', req.params.id)) {
    try { db.prepare('UPDATE cars SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(req.params.id); car.views = (car.views || 0) + 1; } catch {}
  }

  const parsed = parseCar(car);
  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE car_id = ?').get(car.id);
  parsed.rating_avg = stats.avg ? Math.round(stats.avg * 10) / 10 : null;
  parsed.rating_count = stats.count;

  const reviews = db.prepare('SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar FROM reviews r JOIN users u ON r.reviewer_id = u.id WHERE r.car_id = ? ORDER BY r.created_at DESC LIMIT 10').all(car.id);
  parsed.reviews = reviews;

  if (req.user) {
    const fav = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND car_id = ?').get(req.user.id, car.id);
    parsed.is_favorite = Boolean(fav);
  }

  res.json(parsed);
});

/* Coerce an optional numeric body field to an int or null */
const numOrNull = (v) => (v === undefined || v === '' || v === null ? null : Number(v));
const RENT_MODES = ['daily', 'hourly', 'both'];
const cleanRentMode = (v) => (RENT_MODES.includes(v) ? v : 'daily');

router.post('/', auth, carMedia, (req, res) => {
  /* New accounts must be approved by an admin before they can publish a car. */
  const me = db.prepare('SELECT approved, is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!me || (me.approved !== 1 && me.is_admin !== 1)) {
    return res.status(403).json({ error: 'Votre compte est en attente de validation par un administrateur.' });
  }

  const { title, brand, model, year, type, wilaya, city, price_per_day, price_per_hour, rent_mode,
    description, features, seats, transmission, fuel, registration_number, unavailable_until,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url, color, category } = req.body;
  const mode = cleanRentMode(rent_mode);
  /* Daily price is required unless the vehicle is hourly-only. */
  if (!title || !brand || !model || !year || !type || !wilaya || (mode !== 'hourly' && !price_per_day)) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if ((mode === 'hourly' || mode === 'both') && !price_per_hour) {
    return res.status(400).json({ error: 'Le prix par heure est requis pour la location à l\'heure.' });
  }

  const images = (req.files?.images || []).map(f => `/uploads/vehicles/${f.filename}`);
  const plateFile = req.files?.plate_image?.[0];
  const carteGriseFile = req.files?.carte_grise_image?.[0];
  const insuranceFile = req.files?.insurance_image?.[0];

  /* Required to publish a car (client requirement): at least one photo, the
     license-plate photo, the carte grise, and the insurance document. */
  if (!images.length || !plateFile || !carteGriseFile || !insuranceFile) {
    return res.status(400).json({
      error: 'Documents obligatoires manquants : au moins une photo, la photo de la plaque, la carte grise et l\'assurance sont requises.',
    });
  }

  const plate_image = `/uploads/vehicles/${plateFile.filename}`;
  const carte_grise_image = `/api/cars/doc-file/${carteGriseFile.filename}`;
  const insurance_image = `/api/cars/doc-file/${insuranceFile.filename}`;
  const videoFile = req.files?.video?.[0];
  const video = videoFile ? `/uploads/vehicles/${videoFile.filename}` : (video_url || null);
  const id = uuidv4();

  db.prepare(`INSERT INTO cars (id, owner_id, title, brand, model, year, type, category, wilaya, city, price_per_day, price_per_hour, rent_mode, description, features, images, seats, transmission, fuel, color,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url,
    registration_number, plate_image, carte_grise_image, insurance_image, unavailable_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user.id, title, brand, model, Number(year), type, cleanCategory(category), wilaya, city || null,
    mode === 'hourly' ? null : Number(price_per_day), numOrNull(price_per_hour), mode, description || null,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : []),
    JSON.stringify(images),
    Number(seats) || 5, transmission || 'manual', fuel || 'essence', color || null,
    numOrNull(caution), numOrNull(km_per_day), numOrNull(extra_km_price),
    (with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0,
    numOrNull(weekly_price), numOrNull(monthly_price), video,
    registration_number || null, plate_image, carte_grise_image, insurance_image, unavailable_until || null
  );

  /* New vehicle documents are waiting for review — tell the admins live. */
  notifyAdmins(req.app.get('io'), {
    type: 'documents',
    title: 'Nouveaux documents véhicule',
    body: `${title} — carte grise, assurance et plaque à vérifier`,
    link: '/admin',
  });

  res.status(201).json(parseCar(db.prepare('SELECT * FROM cars WHERE id = ?').get(id)));
});

router.put('/:id', auth, carMedia, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  if (car.owner_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  const { title, brand, model, year, type, wilaya, city, price_per_day, price_per_hour, rent_mode,
    description, features, available, seats, transmission, fuel, registration_number, unavailable_until,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url, remove_video, color, category } = req.body;

  /* ── Photo management ──
     `existing_images` (JSON array) is the list of previously-uploaded photos the
     owner chose to KEEP. Anything on the car but not in that list is deleted from
     disk. New uploads are appended. If the field is absent, keep all existing. */
  const priorImages = JSON.parse(car.images || '[]');
  let keptImages = priorImages;
  if (req.body.existing_images !== undefined) {
    try { keptImages = JSON.parse(req.body.existing_images); } catch { keptImages = []; }
    if (!Array.isArray(keptImages)) keptImages = [];
    for (const img of priorImages) if (!keptImages.includes(img)) removeUploadedFile(img);
  }
  const newImages = (req.files?.images || []).map(f => `/uploads/vehicles/${f.filename}`);
  const allImages = [...keptImages, ...newImages];

  /* ── Video ── replace with a new upload, set a URL, or remove entirely. */
  let video = car.video_url;
  const newVideoFile = req.files?.video?.[0];
  if (newVideoFile) {
    removeUploadedFile(car.video_url);
    video = `/uploads/vehicles/${newVideoFile.filename}`;
  } else if (remove_video === 'true' || remove_video === '1') {
    removeUploadedFile(car.video_url);
    video = null;
  } else if (video_url !== undefined) {
    video = video_url || null;
  }

  /* ── Documents ── replace each only when a new file is uploaded. */
  const plateFile = req.files?.plate_image?.[0];
  let plate_image = car.plate_image;
  if (plateFile) { removeUploadedFile(car.plate_image); plate_image = `/uploads/vehicles/${plateFile.filename}`; }

  const carteGriseFile = req.files?.carte_grise_image?.[0];
  let carte_grise_image = car.carte_grise_image;
  if (carteGriseFile) { removePrivateDoc(car.carte_grise_image); carte_grise_image = `/api/cars/doc-file/${carteGriseFile.filename}`; }

  const insuranceFile = req.files?.insurance_image?.[0];
  let insurance_image = car.insurance_image;
  if (insuranceFile) { removePrivateDoc(car.insurance_image); insurance_image = `/api/cars/doc-file/${insuranceFile.filename}`; }

  const keepNum = (v, cur) => (v === undefined || v === '' ? cur : Number(v));
  const mode = rent_mode !== undefined ? cleanRentMode(rent_mode) : car.rent_mode;

  db.prepare(`UPDATE cars SET title=?, brand=?, model=?, year=?, type=?, category=?, wilaya=?, city=?, price_per_day=?, price_per_hour=?, rent_mode=?, description=?, features=?, images=?, available=?, seats=?, transmission=?, fuel=?, color=?,
    caution=?, km_per_day=?, extra_km_price=?, with_driver=?, weekly_price=?, monthly_price=?, video_url=?,
    registration_number=?, plate_image=?, carte_grise_image=?, insurance_image=?, unavailable_until=? WHERE id=?`).run(
    title || car.title, brand || car.brand, model || car.model, Number(year) || car.year,
    type || car.type,
    category !== undefined ? cleanCategory(category, { current: car.category }) : (car.category || cleanCategory(null)),
    wilaya || car.wilaya, city || car.city,
    price_per_day !== undefined ? (price_per_day === '' ? null : Number(price_per_day)) : car.price_per_day,
    price_per_hour !== undefined ? (price_per_hour === '' ? null : Number(price_per_hour)) : car.price_per_hour,
    mode, description || car.description,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : JSON.parse(car.features)),
    JSON.stringify(allImages),
    available !== undefined ? (available === 'true' || available === true ? 1 : 0) : car.available,
    Number(seats) || car.seats, transmission || car.transmission, fuel || car.fuel,
    color !== undefined ? (color || null) : car.color,
    keepNum(caution, car.caution), keepNum(km_per_day, car.km_per_day), keepNum(extra_km_price, car.extra_km_price),
    with_driver !== undefined ? ((with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0) : car.with_driver,
    keepNum(weekly_price, car.weekly_price), keepNum(monthly_price, car.monthly_price),
    video,
    registration_number !== undefined ? (registration_number || null) : car.registration_number,
    plate_image, carte_grise_image, insurance_image,
    unavailable_until !== undefined ? (unavailable_until || null) : car.unavailable_until,
    req.params.id
  );

  res.json(parseCar(db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id)));
});

/* ── Serve a private car document (carte grise / insurance) ──
   Only the car's owner or an admin may fetch it. Token via Authorization header
   or ?token= so an <img src> can load it. Mirrors the KYC file route. */
router.get('/doc-file/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });

  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = bearer || req.query.token;
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Token invalide' }); }

  const me = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(payload.id);
  if (!me) return res.status(401).json({ error: 'Non autorisé' });

  const publicPath = `/api/cars/doc-file/${name}`;
  const owns = db.prepare('SELECT 1 FROM cars WHERE owner_id = ? AND (carte_grise_image = ? OR insurance_image = ?)')
    .get(payload.id, publicPath, publicPath);
  if (me.is_admin !== 1 && !owns) return res.status(403).json({ error: 'Accès refusé' });

  const file = path.join(CAR_DOCS_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Fichier introuvable' });
  res.sendFile(file);
});

router.delete('/:id', auth, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  if (car.owner_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
  db.prepare('DELETE FROM cars WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/favorite', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND car_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND car_id = ?').run(req.user.id, req.params.id);
    res.json({ favorited: false });
  } else {
    db.prepare('INSERT INTO favorites (user_id, car_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ favorited: true });
  }
});

/* Turn rejected/oversized uploads into a clean 400 */
router.use(uploadErrorHandler);

module.exports = router;
