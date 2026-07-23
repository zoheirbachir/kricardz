const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const settings = require('../lib/settings');
const { sendMail } = require('../lib/mailer');

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

/* The clauses binding the renter and the lessor, written into the contract at
   issue time so the signed document is self-contained — a reader never has to
   look anything up elsewhere to know what was agreed. */
function rentalConditions(booking, days) {
  const fmt = (n) => Number(n).toLocaleString('fr-FR');
  const list = [
    "Le locataire déclare détenir un permis de conduire valide et avoir fourni des pièces d'identité authentiques, jointes au présent contrat.",
    "Le véhicule est livré et restitué dans l'état documenté par les photos/vidéos et les relevés kilométriques de livraison et de retour annexés au contrat.",
  ];

  if (booking.km_per_day != null) {
    const total = booking.km_per_day * days;
    const rate = booking.extra_km_price ?? 0;
    list.push(
      `Kilométrage inclus : ${fmt(booking.km_per_day)} km par jour, soit ${fmt(total)} km pour les ${days} jour(s) de location.`
    );
    list.push(
      rate > 0
        ? `Dépassement du kilométrage : chaque kilomètre au-delà des ${fmt(total)} km inclus est facturé ${fmt(rate)} DA. Le montant dû est calculé au retour du véhicule : (kilométrage de retour − kilométrage de livraison − ${fmt(total)}) × ${fmt(rate)} DA, et réglé par le locataire au loueur.`
        : `Kilométrage illimité au-delà de l'allocation incluse : aucun frais de dépassement n'est facturé.`
    );
  } else {
    list.push('Kilométrage illimité : aucun frais de dépassement kilométrique n\'est facturé.');
  }

  if (booking.caution != null && booking.caution > 0) {
    list.push(`Caution : ${fmt(booking.caution)} DA, remise au loueur à la livraison et restituée au retour du véhicule, déduction faite des éventuels frais de dépassement, amendes ou dommages.`);
  }

  list.push(
    "Le locataire restitue le véhicule à la date et au lieu convenus. Tout retard non convenu peut être facturé par le loueur au tarif journalier.",
    "Les amendes, contraventions et infractions commises pendant la période de location sont à la charge exclusive du locataire.",
    "Les dommages causés au véhicule pendant la location, non couverts par l'assurance, sont à la charge du locataire.",
    "Le véhicule ne peut être sous-loué, ni conduit par une personne non déclarée au loueur.",
    "Le carburant est restitué au même niveau qu'à la livraison, sauf accord contraire entre les parties.",
  );
  return list;
}

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
           c.registration_number, c.title AS car_title, c.wilaya AS car_wilaya,
           c.km_per_day, c.extra_km_price, c.caution
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
      caution: booking.caution ?? null,
      currency: 'DA',
    },
    /* Mileage allowance and the excess rate, frozen at signature time so a later
       edit to the listing can't change what the parties agreed. */
    mileage: booking.km_per_day != null ? {
      included_per_day: booking.km_per_day,
      included_total: booking.km_per_day * days,
      extra_km_price: booking.extra_km_price ?? 0,
      currency: 'DA',
    } : null,
    conditions: rentalConditions(booking, days),
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
    const b = db.prepare('SELECT checkin_video, checkin_km, checkin_at, checkin_gps, checkout_video, checkout_km, checkout_at, checkout_gps FROM bookings WHERE id = ?').get(c.booking_id);
    if (b && (b.checkin_at || b.checkout_at)) {
      out.handover = {
        ...b,
        distance_km: (b.checkin_km != null && b.checkout_km != null) ? (b.checkout_km - b.checkin_km) : null,
      };
      /* What the renter owes for exceeding the mileage allowance. Computed from
         the allowance stored IN THE CONTRACT, not from the listing, so editing
         the car afterwards can't change an agreed settlement. */
      const m = out.data.mileage;
      if (m && out.handover.distance_km != null) {
        const extraKm = Math.max(0, out.handover.distance_km - m.included_total);
        out.mileage_settlement = {
          included_total: m.included_total,
          distance_km: out.handover.distance_km,
          extra_km: extraKm,
          extra_km_price: m.extra_km_price,
          amount_due: extraKm * (m.extra_km_price || 0),
          currency: m.currency || 'DA',
        };
      }
    }
  }
  /* Attach the client's identity documents (ID/passport, licence, selfie) to the
     rental contract so they're embedded in the signed document. Served through the
     auth-gated /kyc-file route, which authorises the parties + admin. */
  if (c.type === 'rental' && c.renter_id) {
    const r = db.prepare('SELECT kyc_docs FROM users WHERE id = ?').get(c.renter_id);
    if (r) { try { out.client_docs = JSON.parse(r.kyc_docs || '{}'); } catch { out.client_docs = {}; } }
  }
  /* Legal: prove both parties accepted the terms, and under which version. */
  const parties = [c.agency_owner_id, c.renter_id].filter(Boolean);
  if (parties.length) {
    const rows = db.prepare(
      `SELECT user_id, terms_version, created_at FROM consents
       WHERE user_id IN (${parties.map(() => '?').join(',')})
       ${c.booking_id ? 'AND (booking_id = ? OR booking_id IS NULL)' : ''}
       ORDER BY created_at DESC`
    ).all(...parties, ...(c.booking_id ? [c.booking_id] : []));
    const latest = {};
    for (const r of rows) if (!latest[r.user_id]) latest[r.user_id] = r;
    out.terms_acceptance = {
      version: latest[c.renter_id]?.terms_version || latest[c.agency_owner_id]?.terms_version || null,
      agency: latest[c.agency_owner_id] || null,
      client: latest[c.renter_id] || null,
    };
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

/* Send each party their copy of the fully-signed contract. Best-effort: a mail
   failure must never block the signature itself, and it is only ever sent once. */
async function emailContractToParties(contract) {
  const url = `${process.env.PUBLIC_URL || 'https://kricar-dz.com'}/contracts/${contract.id}`;
  const recipients = db.prepare(
    'SELECT email, name FROM users WHERE id IN (?, ?) AND email IS NOT NULL'
  ).all(contract.agency_owner_id, contract.renter_id || contract.agency_owner_id);

  for (const r of recipients) {
    await sendMail({
      to: r.email,
      subject: `Votre contrat DzKricar ${contract.contract_number}`,
      text: `Bonjour ${r.name},\n\nVotre contrat ${contract.contract_number} a été signé par les deux parties.\nConsultez-le et téléchargez-le ici : ${url}\n\nCe contrat est horodaté et vérifiable par QR code.\n\nDzKricar`,
      html: `<p>Bonjour ${r.name},</p>
<p>Votre contrat <strong>${contract.contract_number}</strong> a été signé par les deux parties.</p>
<p><a href="${url}" style="background:#FF5A0A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Consulter le contrat</a></p>
<p style="color:#666;font-size:13px">Ce contrat est horodaté et vérifiable par QR code.</p>
<p style="color:#666;font-size:13px">DzKricar</p>`,
    });
  }
  db.prepare("UPDATE contracts SET emailed_at = datetime('now') WHERE id = ?").run(contract.id);
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

  const fresh = db.prepare('SELECT * FROM contracts WHERE id = ?').get(c.id);
  /* Once both parties have signed, each receives their copy by email (legal requirement). */
  if (!c.emailed_at && signatures.agency && (c.type === 'partnership' ? signatures.kricar : signatures.client)) {
    emailContractToParties(fresh).catch(e => console.error('contract email failed:', e.message));
  }

  res.json(serialize(fresh));
});

module.exports = router;
