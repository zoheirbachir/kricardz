const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { makeUploader, IMAGE_TYPES } = require('../lib/uploads');
const { AGENCIES_DIR, UPLOADS_ROOT } = require('../config/paths');
const { parseServiceTypes } = require('../lib/serviceTypes');

const router = express.Router();

/* Agency gallery photos (fleet / premises), max 12 per agency. */
const galleryUpload = makeUploader({ dir: AGENCIES_DIR, allow: IMAGE_TYPES, maxMB: 10 });
const MAX_GALLERY = 12;

const parseGallery = (a) => { try { return JSON.parse(a?.gallery || '[]'); } catch { return []; } };

/* Only delete files we own, inside the uploads dir. */
function removeGalleryFile(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const abs = path.join(UPLOADS_ROOT, publicPath.replace(/^\/uploads\//, ''));
  if (!abs.startsWith(UPLOADS_ROOT)) return;
  fs.unlink(abs, () => {});
}

/* Correlated subqueries keep vehicle_count and the rating aggregate independent
   (a JOIN over both cars and reviews would multiply the vehicle count). */
const AGENCY_SELECT = `SELECT a.*,
  (SELECT COUNT(*) FROM cars c WHERE c.owner_id = a.owner_id) AS vehicle_count,
  (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN cars c ON r.car_id = c.id WHERE c.owner_id = a.owner_id) AS rating_avg,
  (SELECT COUNT(*) FROM reviews r JOIN cars c ON r.car_id = c.id WHERE c.owner_id = a.owner_id) AS rating_count,
  (SELECT u.service_types FROM users u WHERE u.id = a.owner_id) AS service_types,
  (SELECT u.avatar FROM users u WHERE u.id = a.owner_id) AS owner_avatar
  FROM agencies a`;

/* The photo that represents an agency everywhere: its uploaded logo if set,
   otherwise the owner's profile picture (chosen via the dashboard avatar). */
const agencyPhoto = (a) => a?.logo || a?.owner_avatar || null;

const withServices = (a) => ({ ...a, service_types: parseServiceTypes(a?.service_types), photo: agencyPhoto(a) });

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
  /* Filter by a declared activity (service type) when asked. */
  if (req.query.service && parseServiceTypes([req.query.service]).length) {
    query += ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = a.owner_id AND u.service_types LIKE ?)`;
    params.push(`%"${req.query.service}"%`);
  }
  query += ` ORDER BY ${SORTS[sort] || SORTS.vehicles}`;
  res.json(db.prepare(query).all(...params).map(withServices));
});

/* The signed-in owner's own agency — used by the dashboard to manage the gallery. */
router.get('/mine', auth, (req, res) => {
  const agency = db.prepare(AGENCY_SELECT + ' WHERE a.owner_id = ?').get(req.user.id);
  if (!agency) return res.status(404).json({ error: 'Aucune agence' });
  res.json({ ...withServices(agency), gallery: parseGallery(agency) });
});

router.get('/:id', (req, res) => {
  const agency = db.prepare(AGENCY_SELECT + ' WHERE a.id = ?').get(req.params.id);
  if (!agency) return res.status(404).json({ error: 'Agence introuvable' });

  const cars = db.prepare('SELECT * FROM cars WHERE owner_id = ? AND available = 1 ORDER BY created_at DESC').all(agency.owner_id);
  agency.cars = cars.map(c => ({ ...c, features: JSON.parse(c.features || '[]'), images: JSON.parse(c.images || '[]') }));
  agency.gallery = parseGallery(agency);

  res.json(withServices(agency));
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

/* ── Gallery management (agency owner only) ── */
function loadOwnAgency(req, res) {
  const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(req.params.id);
  if (!agency) { res.status(404).json({ error: 'Agence introuvable' }); return null; }
  if (agency.owner_id !== req.user.id) { res.status(403).json({ error: 'Accès refusé' }); return null; }
  return agency;
}

router.post('/:id/gallery', auth, galleryUpload.array('photos', MAX_GALLERY), (req, res) => {
  const agency = loadOwnAgency(req, res);
  if (!agency) return;
  const current = parseGallery(agency);
  const added = (req.files || []).map(f => `/uploads/agencies/${f.filename}`);
  if (!added.length) return res.status(400).json({ error: 'Aucune photo reçue.' });
  if (current.length + added.length > MAX_GALLERY) {
    added.forEach(removeGalleryFile);
    return res.status(400).json({ error: `Maximum ${MAX_GALLERY} photos dans la galerie.` });
  }
  const gallery = [...current, ...added];
  db.prepare('UPDATE agencies SET gallery = ? WHERE id = ?').run(JSON.stringify(gallery), agency.id);
  res.json({ gallery });
});

router.delete('/:id/gallery', auth, (req, res) => {
  const agency = loadOwnAgency(req, res);
  if (!agency) return;
  const { photo } = req.body || {};
  if (!photo) return res.status(400).json({ error: 'Photo à supprimer manquante.' });
  const gallery = parseGallery(agency).filter(p => p !== photo);
  removeGalleryFile(photo);
  db.prepare('UPDATE agencies SET gallery = ? WHERE id = ?').run(JSON.stringify(gallery), agency.id);
  res.json({ gallery });
});

module.exports = router;
