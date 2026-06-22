const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const { car_id, booking_id, rating, comment } = req.body;
  if (!car_id || !rating) return res.status(400).json({ error: 'car_id et rating requis' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Note entre 1 et 5' });

  const existing = db.prepare('SELECT id FROM reviews WHERE car_id = ? AND reviewer_id = ?').get(car_id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Vous avez déjà évalué ce véhicule' });

  const id = uuidv4();
  db.prepare('INSERT INTO reviews (id, car_id, reviewer_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, car_id, req.user.id, booking_id || null, Number(rating), comment || null
  );

  const review = db.prepare('SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar FROM reviews r JOIN users u ON r.reviewer_id = u.id WHERE r.id = ?').get(id);
  res.status(201).json(review);
});

router.get('/car/:id', (req, res) => {
  const reviews = db.prepare('SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar FROM reviews r JOIN users u ON r.reviewer_id = u.id WHERE r.car_id = ? ORDER BY r.created_at DESC').all(req.params.id);
  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE car_id = ?').get(req.params.id);
  res.json({ reviews, avg: stats.avg ? Math.round(stats.avg * 10) / 10 : null, count: stats.count });
});

module.exports = router;
