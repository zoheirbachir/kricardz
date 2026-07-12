const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { makeUploader, uploadErrorHandler, MEDIA_TYPES } = require('../lib/uploads');
const { UPLOADS_ROOT, VEHICLES_DIR } = require('../config/paths');

const router = express.Router();

/* Car media: up to 8 photos on `images`, one clip on `video`. Photos are images
   only; the video is mp4/mov/webm. 60MB/file allows a short phone clip.
   VEHICLES_DIR honours UPLOADS_ROOT so media can live outside the deploy dir. */
const UPLOAD_DIR = VEHICLES_DIR;
const upload = makeUploader({ dir: UPLOAD_DIR, allow: MEDIA_TYPES, maxMB: 60 });
const carMedia = upload.fields([{ name: 'images', maxCount: 8 }, { name: 'video', maxCount: 1 }]);

/* Delete an uploaded media file referenced by its public /uploads/... path
   (best-effort; only touches files inside our own uploads dir). */
function removeUploadedFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return; // ignore external URLs (YouTube etc.)
  // Map the public /uploads/... path onto the real (possibly external) uploads root.
  const abs = path.join(UPLOADS_ROOT, publicPath.replace(/^\/uploads\//, ''));
  if (!abs.startsWith(UPLOADS_ROOT)) return; // never escape the uploads dir
  fs.unlink(abs, () => {});
}

function parseCar(car) {
  if (!car) return null;
  return {
    ...car,
    features: JSON.parse(car.features || '[]'),
    images: JSON.parse(car.images || '[]'),
    available: Boolean(car.available),
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
  const { wilaya, type, min_price, max_price, search, include_unavailable, limit = 20, offset = 0 } = req.query;
  /* The public catalog (like kricar-dz.com/search) lists unavailable cars too, with a badge.
     Other callers (e.g. the homepage) omit this flag and only get available cars. */
  const showAll = include_unavailable === '1' || include_unavailable === 'true';

  /* Build the WHERE clause once so the list query and the total count stay in sync */
  const conditions = [showAll ? '1=1' : 'c.available = 1'];
  const whereParams = [];
  if (wilaya) { conditions.push('c.wilaya = ?'); whereParams.push(wilaya); }
  if (type) { conditions.push('c.type = ?'); whereParams.push(type); }
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
  const { title, brand, model, year, type, wilaya, city, price_per_day, price_per_hour, rent_mode,
    description, features, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url } = req.body;
  const mode = cleanRentMode(rent_mode);
  /* Daily price is required unless the vehicle is hourly-only. */
  if (!title || !brand || !model || !year || !type || !wilaya || (mode !== 'hourly' && !price_per_day)) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }
  if ((mode === 'hourly' || mode === 'both') && !price_per_hour) {
    return res.status(400).json({ error: 'Le prix par heure est requis pour la location à l\'heure.' });
  }

  const images = (req.files?.images || []).map(f => `/uploads/vehicles/${f.filename}`);
  const videoFile = req.files?.video?.[0];
  const video = videoFile ? `/uploads/vehicles/${videoFile.filename}` : (video_url || null);
  const id = uuidv4();

  db.prepare(`INSERT INTO cars (id, owner_id, title, brand, model, year, type, wilaya, city, price_per_day, price_per_hour, rent_mode, description, features, images, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user.id, title, brand, model, Number(year), type, wilaya, city || null,
    mode === 'hourly' ? null : Number(price_per_day), numOrNull(price_per_hour), mode, description || null,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : []),
    JSON.stringify(images),
    Number(seats) || 5, transmission || 'manual', fuel || 'essence',
    numOrNull(caution), numOrNull(km_per_day), numOrNull(extra_km_price),
    (with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0,
    numOrNull(weekly_price), numOrNull(monthly_price), video
  );

  res.status(201).json(parseCar(db.prepare('SELECT * FROM cars WHERE id = ?').get(id)));
});

router.put('/:id', auth, carMedia, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  if (car.owner_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  const { title, brand, model, year, type, wilaya, city, price_per_day, price_per_hour, rent_mode,
    description, features, available, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url, remove_video } = req.body;

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

  const keepNum = (v, cur) => (v === undefined || v === '' ? cur : Number(v));
  const mode = rent_mode !== undefined ? cleanRentMode(rent_mode) : car.rent_mode;

  db.prepare(`UPDATE cars SET title=?, brand=?, model=?, year=?, type=?, wilaya=?, city=?, price_per_day=?, price_per_hour=?, rent_mode=?, description=?, features=?, images=?, available=?, seats=?, transmission=?, fuel=?,
    caution=?, km_per_day=?, extra_km_price=?, with_driver=?, weekly_price=?, monthly_price=?, video_url=? WHERE id=?`).run(
    title || car.title, brand || car.brand, model || car.model, Number(year) || car.year,
    type || car.type, wilaya || car.wilaya, city || car.city,
    price_per_day !== undefined ? (price_per_day === '' ? null : Number(price_per_day)) : car.price_per_day,
    price_per_hour !== undefined ? (price_per_hour === '' ? null : Number(price_per_hour)) : car.price_per_hour,
    mode, description || car.description,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : JSON.parse(car.features)),
    JSON.stringify(allImages),
    available !== undefined ? (available === 'true' || available === true ? 1 : 0) : car.available,
    Number(seats) || car.seats, transmission || car.transmission, fuel || car.fuel,
    keepNum(caution, car.caution), keepNum(km_per_day, car.km_per_day), keepNum(extra_km_price, car.extra_km_price),
    with_driver !== undefined ? ((with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0) : car.with_driver,
    keepNum(weekly_price, car.weekly_price), keepNum(monthly_price, car.monthly_price),
    video,
    req.params.id
  );

  res.json(parseCar(db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id)));
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
