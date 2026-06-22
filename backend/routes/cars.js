const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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

  /* Increment the view counter (best-effort, don't fail the request on error) */
  try { db.prepare('UPDATE cars SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(req.params.id); car.views = (car.views || 0) + 1; } catch {}

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

router.post('/', auth, upload.array('images', 8), (req, res) => {
  const { title, brand, model, year, type, wilaya, city, price_per_day, description, features, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url } = req.body;
  if (!title || !brand || !model || !year || !type || !wilaya || !price_per_day) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const images = (req.files || []).map(f => `/uploads/${f.filename}`);
  const id = uuidv4();

  db.prepare(`INSERT INTO cars (id, owner_id, title, brand, model, year, type, wilaya, city, price_per_day, description, features, images, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.user.id, title, brand, model, Number(year), type, wilaya, city || null,
    Number(price_per_day), description || null,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : []),
    JSON.stringify(images),
    Number(seats) || 5, transmission || 'manual', fuel || 'essence',
    numOrNull(caution), numOrNull(km_per_day), numOrNull(extra_km_price),
    (with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0,
    numOrNull(weekly_price), numOrNull(monthly_price), video_url || null
  );

  res.status(201).json(parseCar(db.prepare('SELECT * FROM cars WHERE id = ?').get(id)));
});

router.put('/:id', auth, upload.array('images', 8), (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  if (car.owner_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  const { title, brand, model, year, type, wilaya, city, price_per_day, description, features, available, seats, transmission, fuel,
    caution, km_per_day, extra_km_price, with_driver, weekly_price, monthly_price, video_url } = req.body;
  const newImages = (req.files || []).map(f => `/uploads/${f.filename}`);
  const existingImages = JSON.parse(car.images || '[]');
  const allImages = [...existingImages, ...newImages];
  /* Keep the existing value when a field is omitted from the request */
  const keepNum = (v, cur) => (v === undefined || v === '' ? cur : Number(v));

  db.prepare(`UPDATE cars SET title=?, brand=?, model=?, year=?, type=?, wilaya=?, city=?, price_per_day=?, description=?, features=?, images=?, available=?, seats=?, transmission=?, fuel=?,
    caution=?, km_per_day=?, extra_km_price=?, with_driver=?, weekly_price=?, monthly_price=?, video_url=? WHERE id=?`).run(
    title || car.title, brand || car.brand, model || car.model, Number(year) || car.year,
    type || car.type, wilaya || car.wilaya, city || car.city, Number(price_per_day) || car.price_per_day,
    description || car.description,
    JSON.stringify(features ? (Array.isArray(features) ? features : [features]) : JSON.parse(car.features)),
    JSON.stringify(allImages),
    available !== undefined ? (available === 'true' || available === true ? 1 : 0) : car.available,
    Number(seats) || car.seats, transmission || car.transmission, fuel || car.fuel,
    keepNum(caution, car.caution), keepNum(km_per_day, car.km_per_day), keepNum(extra_km_price, car.extra_km_price),
    with_driver !== undefined ? ((with_driver === 'true' || with_driver === true || with_driver === '1') ? 1 : 0) : car.with_driver,
    keepNum(weekly_price, car.weekly_price), keepNum(monthly_price, car.monthly_price),
    video_url !== undefined ? (video_url || null) : car.video_url,
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

module.exports = router;
