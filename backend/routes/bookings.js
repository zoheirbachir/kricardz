const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { makeUploader, VIDEO_TYPES } = require('../lib/uploads');
const { HANDOVER_DIR } = require('../config/paths');
const { notify } = require('../lib/notify');
const legal = require('../lib/legal');

const router = express.Router();

/* Handover videos (before delivery / after return) — public path /uploads/handover/... */
const handoverUpload = makeUploader({ dir: HANDOVER_DIR, allow: VIDEO_TYPES, maxMB: 60 });

router.post('/', auth, (req, res) => {
  /* New accounts must be approved by an admin before they can book. */
  const me = db.prepare('SELECT approved, is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!me || (me.approved !== 1 && me.is_admin !== 1)) {
    return res.status(403).json({ error: 'Votre compte est en attente de validation par un administrateur.' });
  }

  const { car_id, start_date, end_date, message } = req.body;
  if (!car_id || !start_date || !end_date) return res.status(400).json({ error: 'Données manquantes' });

  /* Legal: the renter must accept the terms before the booking is created. */
  const acceptTerms = req.body.accept_terms;
  if (!(acceptTerms === true || acceptTerms === 'true' || acceptTerms === '1' || acceptTerms === 1)) {
    return res.status(400).json({ error: 'Vous devez accepter les conditions de location avant de confirmer la réservation.' });
  }

  const car = db.prepare('SELECT * FROM cars WHERE id = ? AND available = 1').get(car_id);
  if (!car) return res.status(404).json({ error: 'Véhicule introuvable ou indisponible' });
  if (car.unavailable_until && new Date(car.unavailable_until) > new Date()) {
    return res.status(409).json({ error: `Véhicule indisponible jusqu'au ${new Date(car.unavailable_until).toLocaleDateString('fr-FR')}.` });
  }
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

  /* Legal audit trail: consent tied to this specific booking. */
  legal.recordConsent(req, req.user.id, { context: 'booking', booking_id: id });

  /* Tell the owner/agency straight away. */
  notify(req.app.get('io'), car.owner_id, {
    type: 'booking',
    title: 'Nouvelle réservation',
    body: `${car.title} — du ${start_date} au ${end_date}`,
    link: '/dashboard/owner',
  });

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
  /* The agency receives the client's full identity, driving-license details AND
     the documents the client uploaded at registration (ID/passport, licence,
     selfie…) — everything needed to verify identity before handing over the car.
     The doc files are still served only through the auth-gated /kyc-file route,
     which authorises the agency for clients who have a booking on its cars. */
  const bookings = db.prepare(`
    SELECT b.*, c.title, c.brand, c.model, c.images,
           u.name as renter_name, u.phone as renter_phone, u.email as renter_email,
           u.document_type as renter_document_type, u.document_number as renter_id_number,
           u.driving_license_number as renter_license_number,
           u.driving_license_issued_date as renter_license_issued,
           u.driving_license_expiry_date as renter_license_expiry,
           u.kyc_docs as renter_kyc_docs
    FROM bookings b
    JOIN cars c ON b.car_id = c.id
    JOIN users u ON b.renter_id = u.id
    WHERE c.owner_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json(bookings.map(b => {
    let renter_docs = {};
    try { renter_docs = JSON.parse(b.renter_kyc_docs || '{}'); } catch { renter_docs = {}; }
    const { renter_kyc_docs, ...rest } = b;
    return { ...rest, images: JSON.parse(b.images || '[]'), renter_docs };
  }));
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
  /* Only the owner can confirm or mark a rental completed; either party may cancel. */
  if (status === 'confirmed' && !isOwner) return res.status(403).json({ error: 'Seul le propriétaire peut confirmer' });
  if (status === 'completed' && !isOwner) return res.status(403).json({ error: 'Seul le propriétaire peut marquer la réservation terminée.' });

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);

  /* Notify the other party of the new state. */
  const car = db.prepare('SELECT title FROM cars WHERE id = ?').get(booking.car_id);
  const LABELS = { confirmed: 'Réservation confirmée', cancelled: 'Réservation annulée', completed: 'Location terminée' };
  notify(req.app.get('io'), isOwner ? booking.renter_id : booking.owner_id, {
    type: 'booking',
    title: LABELS[status] || 'Réservation mise à jour',
    body: car?.title || undefined,
    link: isOwner ? '/dashboard' : '/dashboard/owner',
  });

  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

/* ── Vehicle handover (client requirement) ──
   The owner documents the car with a video + odometer reading before delivery
   (check-in) and after return (check-out). Distance = checkout_km - checkin_km.
   Owner-only, and only once the booking is confirmed/completed. */
function loadOwnedBooking(req, res) {
  const booking = db.prepare(`
    SELECT b.*, c.owner_id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE b.id = ?
  `).get(req.params.id);
  if (!booking) { res.status(404).json({ error: 'Réservation introuvable' }); return null; }
  if (booking.owner_id !== req.user.id) { res.status(403).json({ error: 'Seul le propriétaire peut documenter la remise du véhicule.' }); return null; }
  if (!['confirmed', 'completed'].includes(booking.status)) {
    res.status(409).json({ error: 'La remise ne peut être enregistrée qu\'après confirmation de la réservation.' });
    return null;
  }
  return booking;
}

router.post('/:id/checkin', auth, handoverUpload.single('checkin_video'), (req, res) => {
  const booking = loadOwnedBooking(req, res);
  if (!booking) return;
  const km = req.body.checkin_km;
  if (km === undefined || km === '' || isNaN(Number(km))) return res.status(400).json({ error: 'Le kilométrage de départ est requis.' });
  const video = req.file ? `/uploads/handover/${req.file.filename}` : booking.checkin_video;
  db.prepare('UPDATE bookings SET checkin_video = ?, checkin_km = ?, checkin_at = datetime(\'now\') WHERE id = ?')
    .run(video, Number(km), req.params.id);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

router.post('/:id/checkout', auth, handoverUpload.single('checkout_video'), (req, res) => {
  const booking = loadOwnedBooking(req, res);
  if (!booking) return;
  const km = req.body.checkout_km;
  if (km === undefined || km === '' || isNaN(Number(km))) return res.status(400).json({ error: 'Le kilométrage de retour est requis.' });
  if (booking.checkin_km != null && Number(km) < booking.checkin_km) {
    return res.status(400).json({ error: 'Le kilométrage de retour doit être supérieur ou égal à celui de départ.' });
  }
  const video = req.file ? `/uploads/handover/${req.file.filename}` : booking.checkout_video;
  db.prepare('UPDATE bookings SET checkout_video = ?, checkout_km = ?, checkout_at = datetime(\'now\') WHERE id = ?')
    .run(video, Number(km), req.params.id);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

module.exports = router;
