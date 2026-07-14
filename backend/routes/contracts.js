const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const settings = require('../lib/settings');

const router = express.Router();

/* DzKricar's own legal identity — printed on every contract + stamp.
   Read from app_settings so an admin can update e.g. the commercial-register number
   (used in the contract stamp/QR) without a code change. */

/* Human-readable, unique contract number: KC-<R|P>-<year>-<6-digit seq>. */
function nextContractNumber(type) {
  const prefix = type === 'partnership' ? 'P' : 'R';
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT COUNT(*) AS n FROM contracts WHERE type = ?').get(type);
  const seq = String((row?.n || 0) + 1).padStart(6, '0');
  return `KC-${prefix}-${year}-${seq}`;
}

function newQrToken() {
  return crypto.randomBytes(16).toString('hex');
}

/* Platform liability disclaimer printed on every contract after the signatures. */
const DISCLAIMER = "Après signature des deux parties, DzKricar agit uniquement comme intermédiaire technique de mise en relation et décline toute responsabilité concernant l'exécution de la location, l'état du véhicule, les paiements ou tout litige entre le loueur et le locataire. Chaque partie demeure seule responsable de ses obligations.";

/* Build the agency/owner identity block from the owner user record. */
function agencyBlock(owner) {
  return {
    name: owner.agency_legal_name || owner.name,
    manager_name: owner.name,
    commercial_reg_number: owner.agency_commercial_reg_number || '—',
    address: owner.agency_address || '—',
    national_id_number: owner.national_id_number || owner.document_number || '—',
    phone: owner.phone || '—',
    email: owner.email || '—',
  };
}

/* ── Generate (or fetch existing) PARTNERSHIP contract for the calling agency ── */
router.post('/partnership', auth, (req, res) => {
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!owner || owner.role !== 'owner') {
    return res.status(403).json({ error: 'Seules les agences peuvent générer un contrat de partenariat.' });
  }

  const existing = db.prepare(`SELECT * FROM contracts WHERE type = 'partnership' AND agency_owner_id = ?`).get(owner.id);
  if (existing) return res.json(serialize(existing));

  const now = new Date();
  const end = new Date(now); end.setMonth(end.getMonth() + 3); // 3 free months
  const data = {
    kricar: settings.kricarInfo(),
    agency: agencyBlock(owner),
    terms: {
      free_period_months: 3,
      free_start: now.toISOString().slice(0, 10),
      free_end: end.toISOString().slice(0, 10),
      early_partner_discount: 30, // permanent % when e-payment launches
      benefits: [
        'Utilisation gratuite et complète de la plateforme pendant 3 mois',
        'Support technique complet',
        "Mise en avant de l'agence dans l'application",
        "Réduction permanente de 30% à l'ouverture du paiement électronique (partenaire fondateur)",
      ],
    },
    disclaimer: DISCLAIMER,
    issued_at: now.toISOString(),
  };

  const id = uuidv4();
  const contract_number = nextContractNumber('partnership');
  const qr_token = newQrToken();
  db.prepare(`
    INSERT INTO contracts (id, contract_number, type, agency_owner_id, data, qr_token)
    VALUES (?, ?, 'partnership', ?, ?, ?)
  `).run(id, contract_number, owner.id, JSON.stringify(data), qr_token);

  res.status(201).json(serialize(db.prepare('SELECT * FROM contracts WHERE id = ?').get(id)));
});

/* ── Generate (or fetch existing) RENTAL contract for a booking ── */
router.post('/rental/:bookingId', auth, (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, c.owner_id, c.brand, c.model, c.year, c.type AS car_type,
           c.registration_number, c.title AS car_title, c.wilaya AS car_wilaya
    FROM bookings b JOIN cars c ON b.car_id = c.id WHERE b.id = ?
  `).get(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Réservation introuvable' });

  /* Only the two parties (or an admin) may generate the contract. */
  const me = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  const isParty = booking.owner_id === req.user.id || booking.renter_id === req.user.id;
  if (!isParty && !me?.is_admin) return res.status(403).json({ error: 'Accès refusé' });

  /* A rental contract represents an agreed rental — it must not be generated
     before the owner has actually confirmed the booking (matches the same rule
     already enforced for reviews). */
  if (!['confirmed', 'completed'].includes(booking.status) && !me?.is_admin) {
    return res.status(409).json({ error: 'Le contrat ne peut être généré qu\'après confirmation de la réservation par le propriétaire.' });
  }

  const existing = db.prepare(`SELECT * FROM contracts WHERE type = 'rental' AND booking_id = ?`).get(booking.id);
  if (existing) return res.json(serialize(existing));

  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(booking.owner_id);
  const renter = db.prepare('SELECT * FROM users WHERE id = ?').get(booking.renter_id);

  const days = Math.max(1, Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000));
  const data = {
    kricar: settings.kricarInfo(),
    agency: agencyBlock(owner),
    client: {
      name: renter.name,
      phone: renter.phone || '—',
      email: renter.email || '—',
      id_number: renter.document_number || '—',
      driving_license_number: renter.driving_license_number || '—',
      driving_license_issued_date: renter.driving_license_issued_date || '—',
      driving_license_expiry_date: renter.driving_license_expiry_date || '—',
    },
    vehicle: {
      title: booking.car_title,
      brand: booking.brand,
      model: booking.model,
      year: booking.year,
      type: booking.car_type,
      registration_number: booking.registration_number || '—',
      wilaya: booking.car_wilaya,
    },
    rental: {
      start_date: booking.start_date,
      end_date: booking.end_date,
      days,
      total_price: booking.total_price,
      currency: 'DA',
    },
    disclaimer: DISCLAIMER,
    issued_at: new Date().toISOString(),
  };

  const id = uuidv4();
  const contract_number = nextContractNumber('rental');
  const qr_token = newQrToken();
  db.prepare(`
    INSERT INTO contracts (id, contract_number, type, booking_id, agency_owner_id, renter_id, data, qr_token)
    VALUES (?, ?, 'rental', ?, ?, ?, ?, ?)
  `).run(id, contract_number, booking.id, owner.id, renter.id, JSON.stringify(data), qr_token);

  res.status(201).json(serialize(db.prepare('SELECT * FROM contracts WHERE id = ?').get(id)));
});

/* ── List my contracts (as agency owner or as renter) ── */
router.get('/mine', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM contracts WHERE agency_owner_id = ? OR renter_id = ? ORDER BY created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(rows.map(serialize));
});

/* ── Full contract (parties or admin only) ── */
router.get('/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrat introuvable' });
  const me = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  const isParty = c.agency_owner_id === req.user.id || c.renter_id === req.user.id;
  if (!isParty && !me?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
  res.json(serialize(c));
});

/* ── PUBLIC verification (QR scan) — minimal, no sensitive data ── */
router.get('/verify/:token', (req, res) => {
  const c = db.prepare('SELECT * FROM contracts WHERE qr_token = ?').get(req.params.token);
  if (!c) return res.status(404).json({ valid: false, error: 'Contrat introuvable ou non authentique.' });
  const data = JSON.parse(c.data);
  res.json({
    valid: true,
    contract_number: c.contract_number,
    type: c.type,
    status: c.status,
    issued_at: data.issued_at,
    agency_name: data.agency?.name || null,
    client_name: data.client?.name || null,
    vehicle: data.vehicle ? `${data.vehicle.brand} ${data.vehicle.model}` : null,
  });
});

function serialize(c) {
  let signatures = {};
  try { signatures = JSON.parse(c.signatures || '{}'); } catch { signatures = {}; }
  const out = { ...c, data: JSON.parse(c.data), signatures };
  /* Attach the current handover record (check-in/out video + km) for rentals, so
     the contract always reflects the latest state even if it was documented after
     the contract was generated. Distance = checkout_km - checkin_km. */
  if (c.type === 'rental' && c.booking_id) {
    const b = db.prepare('SELECT checkin_video, checkin_km, checkin_at, checkout_video, checkout_km, checkout_at FROM bookings WHERE id = ?').get(c.booking_id);
    if (b && (b.checkin_at || b.checkout_at)) {
      out.handover = {
        ...b,
        distance_km: (b.checkin_km != null && b.checkout_km != null) ? (b.checkout_km - b.checkin_km) : null,
      };
    }
  }
  /* Attach the client's identity documents (ID/passport, licence, selfie) to the
     rental contract so they're embedded in the signed document. Served through the
     auth-gated /kyc-file route, which authorises the parties + admin. */
  if (c.type === 'rental' && c.renter_id) {
    const r = db.prepare('SELECT kyc_docs FROM users WHERE id = ?').get(c.renter_id);
    if (r) { try { out.client_docs = JSON.parse(r.kyc_docs || '{}'); } catch { out.client_docs = {}; } }
  }
  return out;
}

/* Which signature slot may the current user fill on this contract?
   - partnership: admin → 'kricar'; the agency owner → 'agency'
   - rental:      the agency/loueur → 'agency'; the renter/client → 'client' */
function signatureSlotFor(contract, userId, isAdmin) {
  if (contract.type === 'partnership') {
    if (contract.agency_owner_id === userId) return 'agency';
    if (isAdmin) return 'kricar';
  } else if (contract.type === 'rental') {
    if (contract.agency_owner_id === userId) return 'agency';
    if (contract.renter_id === userId) return 'client';
  }
  return null;
}

/* ── Sign a contract online (finger-drawn signature, e.g. from a phone) ── */
router.post('/:id/sign', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrat introuvable' });

  const me = db.prepare('SELECT is_admin, name FROM users WHERE id = ?').get(req.user.id);
  const slot = signatureSlotFor(c, req.user.id, me?.is_admin === 1);
  if (!slot) return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à signer ce contrat.' });

  const { signature } = req.body;
  if (!signature || typeof signature !== 'string' || !signature.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Signature invalide.' });
  }
  if (signature.length > 300000) return res.status(400).json({ error: 'Signature trop volumineuse.' });

  let signatures = {};
  try { signatures = JSON.parse(c.signatures || '{}'); } catch { signatures = {}; }
  signatures[slot] = { image: signature, name: me?.name || null, signed_at: new Date().toISOString() };
  db.prepare('UPDATE contracts SET signatures = ? WHERE id = ?').run(JSON.stringify(signatures), c.id);

  res.json(serialize(db.prepare('SELECT * FROM contracts WHERE id = ?').get(c.id)));
});

module.exports = router;
