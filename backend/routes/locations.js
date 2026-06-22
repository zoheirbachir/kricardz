const express = require('express');
const db = require('../db/database');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/* GPS device pushes location — authenticated by gps_token header or owner JWT */
router.post('/cars/:id', (req, res) => {
  const gpsToken = req.headers['x-gps-token'];
  const authHeader = req.headers.authorization;

  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });

  /* Validate: either gps_token matches, or Bearer token belongs to owner */
  if (gpsToken) {
    if (!car.gps_token || car.gps_token !== gpsToken) {
      return res.status(401).json({ error: 'GPS token invalide' });
    }
  } else if (authHeader?.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'kricar_secret_2024';
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
      if (payload.id !== car.owner_id) return res.status(403).json({ error: 'Accès refusé' });
    } catch {
      return res.status(401).json({ error: 'Token invalide' });
    }
  } else {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  const { lat, lng, speed = 0, heading = 0 } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat et lng requis' });

  /* Upsert into car_locations and sync shortcut on cars table */
  db.prepare(`
    INSERT INTO car_locations (car_id, lat, lng, speed, heading, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(car_id) DO UPDATE SET lat=excluded.lat, lng=excluded.lng,
      speed=excluded.speed, heading=excluded.heading, updated_at=excluded.updated_at
  `).run(req.params.id, lat, lng, speed, heading);

  db.prepare('UPDATE cars SET lat=?, lng=? WHERE id=?').run(lat, lng, req.params.id);

  /* Broadcast via Socket.io (attached to app in server.js) */
  const io = req.app.get('io');
  if (io) {
    io.to(`car:${req.params.id}`).emit('car:location', {
      car_id: req.params.id,
      lat, lng, speed, heading,
      updated_at: new Date().toISOString(),
    });
  }

  res.json({ ok: true });
});

/* Get current location of a car */
router.get('/cars/:id', optionalAuth, (req, res) => {
  const loc = db.prepare('SELECT * FROM car_locations WHERE car_id = ?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Aucune position disponible pour ce véhicule' });
  res.json(loc);
});

/* Get all available cars with their location (for map view) */
router.get('/cars', (req, res) => {
  const cars = db.prepare(`
    SELECT c.id, c.title, c.brand, c.model, c.type, c.price_per_day, c.wilaya,
           cl.lat, cl.lng, cl.speed, cl.updated_at as loc_updated_at
    FROM cars c
    JOIN car_locations cl ON c.id = cl.car_id
    WHERE c.available = 1
  `).all();
  res.json(cars);
});

/* Owner sets a GPS token for their car */
router.post('/cars/:id/token', auth, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable' });
  if (car.owner_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });

  const { v4: uuidv4 } = require('uuid');
  const token = uuidv4().replace(/-/g, '');
  db.prepare('UPDATE cars SET gps_token = ? WHERE id = ?').run(token, req.params.id);
  res.json({ gps_token: token });
});

module.exports = router;
