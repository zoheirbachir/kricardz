const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const { car_id, start_date, end_date, message } = req.body;
  if (!car_id || !start_date || !end_date) return res.status(400).json({ error: 'Données manquantes' });

  const car = db.prepare('SELECT * FROM cars WHERE id = ? AND available = 1').get(car_id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable ou indisponible' });
  if (car.owner_id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre véhicule' });

  const days = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000);
  if (days < 1) return res.status(400).json({ error: 'Dates invalides' });

  const conflict = db.prepare(
    `SELECT id FROM bookings WHERE car_id = ? AND status NOT IN ('cancelled') AND NOT (end_date <= ? OR start_date >= ?)`
  ).get(car_id, start_date, end_date);
  if (conflict) return res.status(409).json({ error: 'Véhicule déjà réservé pour ces dates' });

  const id = uuidv4();
  db.prepare('INSERT INTO bookings (id, car_id, renter_id, start_date, end_date, total_price, message) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, car_id, req.user.id, start_date, end_date, days * car.price_per_day, message || null
  );

  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
});

router.get('/my', auth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, c.title, c.brand, c.model, c.images, c.wilaya, c.price_per_day,
           u.name as owner_name, u.phone as owner_phone
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    JOIN users u ON c.owner_id = u.id
    WHERE b.renter_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json(bookings.map(b => ({ ...b, images: JSON.parse(b.images || '[]') })));
});

router.get('/owner', auth, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, c.title, c.brand, c.model, c.images,
           u.name as renter_name, u.phone as renter_phone, u.email as renter_email
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    JOIN users u ON b.renter_id = u.id
    WHERE c.owner_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json(bookings.map(b => ({ ...b, images: JSON.parse(b.images || '[]') })));
});

router.put('/:id/status', auth, (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, c.owner_id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE b.id = ?
  `).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Réservation introuvable' });

  const { status } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

  const isOwner = booking.owner_id === req.user.id;
  const isRenter = booking.renter_id === req.user.id;
  if (!isOwner && !isRenter) return res.status(403).json({ error: 'Accès refusé' });
  if (status === 'confirmed' && !isOwner) return res.status(403).json({ error: 'Seul le propriétaire peut confirmer' });

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

module.exports = router;
