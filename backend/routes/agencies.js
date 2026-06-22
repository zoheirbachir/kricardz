const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* Correlated subqueries keep vehicle_count and the rating aggregate independent
   (a JOIN over both cars and reviews would multiply the vehicle count). */
const AGENCY_SELECT = `SELECT a.*,
  (SELECT COUNT(*) FROM cars c WHERE c.owner_id = a.owner_id) AS vehicle_count,
  (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN cars c ON r.car_id = c.id WHERE c.owner_id = a.owner_id) AS rating_avg,
  (SELECT COUNT(*) FROM reviews r JOIN cars c ON r.car_id = c.id WHERE c.owner_id = a.owner_id) AS rating_count
  FROM agencies a`;

const SORTS = {
  recent: 'a.created_at DESC',
  rating: 'rating_avg DESC, rating_count DESC',
  vehicles: 'vehicle_count DESC',
};

router.get('/', (req, res) => {
  const { wilaya, type, search, sort } = req.query;
  let query = AGENCY_SELECT + ' WHERE 1=1';
  const params = [];
  if (wilaya) { query += ' AND a.wilaya = ?'; params.push(wilaya); }
  if (type) { query += ' AND a.agency_type = ?'; params.push(type); }
  if (search) { query += ' AND a.name LIKE ?'; params.push(`%${search}%`); }
  query += ` ORDER BY ${SORTS[sort] || SORTS.vehicles}`;
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const agency = db.prepare(AGENCY_SELECT + ' WHERE a.id = ?').get(req.params.id);
  if (!agency) return res.status(404).json({ error: 'Agence introuvable' });

  const cars = db.prepare('SELECT * FROM cars WHERE owner_id = ? AND available = 1 ORDER BY created_at DESC').all(agency.owner_id);
  agency.cars = cars.map(c => ({ ...c, features: JSON.parse(c.features || '[]'), images: JSON.parse(c.images || '[]') }));

  res.json(agency);
});

router.post('/', auth, (req, res) => {
  const { name, description, wilaya, city, phone, email, agency_type, cover } = req.body;
  if (!name || !wilaya) return res.status(400).json({ error: 'Nom et wilaya requis' });

  const existing = db.prepare('SELECT id FROM agencies WHERE owner_id = ?').get(req.user.id);
  if (existing) return res.status(409).json({ error: 'Vous avez déjà une agence' });

  const id = uuidv4();
  db.prepare('INSERT INTO agencies (id, owner_id, name, description, wilaya, city, phone, email, agency_type, cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, req.user.id, name, description || null, wilaya, city || null, phone || null, email || null,
    agency_type || 'classic', cover || null
  );

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('owner', req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM agencies WHERE id = ?').get(id));
});

module.exports = router;
