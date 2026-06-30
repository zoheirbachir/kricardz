const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { sendMail, isDevMail } = require('../lib/mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kricar_secret_2024';

/* ── Token + audit helpers (email verification & password reset) ── */
const rawToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const inHours = (h) => new Date(Date.now() + h * 3600000).toISOString();

/* Where the SPA lives, for building email links. APP_URL wins; else the browser's
   origin (request that triggered it); else localhost dev frontend. */
function appBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const origin = req.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:5173';
}

function logEvent(userId, email, type, req) {
  try {
    db.prepare('INSERT INTO auth_events (id, user_id, email, type, ip) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), userId || null, email || null, type, req.ip || req.headers['x-forwarded-for'] || null
    );
  } catch { /* audit log is best-effort */ }
}

/* Simple per-email rate limit using the audit log. */
function tooManyRecent(email, type, maxCount, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60000).toISOString().slice(0, 19).replace('T', ' ');
  const row = db.prepare('SELECT COUNT(*) AS n FROM auth_events WHERE email = ? AND type = ? AND created_at >= ?').get(email, type, since);
  return (row?.n || 0) >= maxCount;
}

async function sendVerificationEmail(user, req) {
  const raw = rawToken();
  db.prepare('UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?')
    .run(hashToken(raw), inHours(24), user.id);
  const link = `${appBaseUrl(req)}/verify-email?token=${raw}`;
  const result = await sendMail({
    to: user.email,
    subject: 'KriCar — Confirmez votre adresse email',
    text: `Bienvenue sur KriCar !\n\nConfirmez votre adresse email en ouvrant ce lien (valable 24h) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: `<p>Bienvenue sur <b>KriCar</b> !</p><p>Confirmez votre adresse email (lien valable 24h) :</p><p><a href="${link}">Confirmer mon adresse email</a></p><p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`,
  });
  logEvent(user.id, user.email, 'email_verify_sent', req);
  return result.dev ? link : null; // raw link returned only in dev mode
}

/* ── KYC file uploads ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });
const KYC_FIELDS = [
  { name: 'driving_license_front', maxCount: 1 },
  { name: 'driving_license_back', maxCount: 1 },
  { name: 'secondary_front_image', maxCount: 1 },
  { name: 'secondary_back_image', maxCount: 1 },
  { name: 'front_image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 },
  { name: 'selfie_image', maxCount: 1 },
  { name: 'agency_commercial_register', maxCount: 1 },
];

/* Accepts JSON (basic) or multipart/form-data (with KYC documents). */
router.post('/register', upload.fields(KYC_FIELDS), async (req, res) => {
  try {
    const {
      email, password, name, phone, role,
      document_type, document_number, secondary_document_type,
      driving_license_number, driving_license_issued_date, driving_license_expiry_date, lessor_type,
      agency_legal_name, agency_commercial_reg_number, agency_address, national_id_number,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, mot de passe et nom requis' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    /* Collect uploaded document paths */
    const files = req.files || {};
    const docs = {};
    for (const f of KYC_FIELDS) {
      if (files[f.name] && files[f.name][0]) docs[f.name] = `/uploads/${files[f.name][0].filename}`;
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const safeRole = (role === 'owner' || role === 'lessor') ? 'owner' : 'renter';
    const submittedKyc = Object.keys(docs).length > 0;

    db.prepare(`
      INSERT INTO users
        (id, email, password_hash, name, phone, role,
         kyc_status, lessor_type, document_type, document_number,
         driving_license_number, driving_license_issued_date, driving_license_expiry_date,
         agency_legal_name, agency_commercial_reg_number, agency_address, national_id_number, kyc_docs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, email, hash, name, phone || null, safeRole,
      submittedKyc ? 'pending' : 'none',
      lessor_type || null,
      secondary_document_type || document_type || null,
      document_number || null,
      driving_license_number || null,
      driving_license_issued_date || null,
      driving_license_expiry_date || null,
      agency_legal_name || null,
      agency_commercial_reg_number || null,
      agency_address || null,
      national_id_number || null,
      JSON.stringify(docs)
    );

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, email_verified, kyc_status, is_admin FROM users WHERE id = ?').get(id);

    /* Fire off the email-confirmation message (dev mode returns the link to show on screen). */
    let dev_verify_link = null;
    try { dev_verify_link = await sendVerificationEmail(user, req); } catch (e) { console.error('verify email failed:', e.message); }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user, email_verification_required: true, dev_verify_link });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const identifier = (email || '').trim();
  if (!identifier || !password) return res.status(400).json({ error: 'Email/téléphone et mot de passe requis' });

  /* The login field accepts either an email or a phone number */
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier, identifier);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });
  if (user.banned === 1) return res.status(403).json({ error: 'Ce compte a été bloqué par un administrateur.' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, email_verified, kyc_status, kyc_rejection_reason, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

/* ── Confirm email address (link from the verification email) ── */
router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Jeton manquant' });
  const user = db.prepare('SELECT * FROM users WHERE email_verify_token = ?').get(hashToken(token));
  if (!user) return res.status(400).json({ error: 'Lien invalide ou déjà utilisé.' });
  if (user.email_verify_expires && user.email_verify_expires < new Date().toISOString()) {
    return res.status(400).json({ error: 'Lien expiré. Demandez un nouvel email de confirmation.' });
  }
  db.prepare('UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?').run(user.id);
  logEvent(user.id, user.email, 'email_verified', req);
  res.json({ success: true, email: user.email });
});

/* ── Resend the verification email ── */
router.post('/resend-verification', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requis' });
  if (tooManyRecent(email, 'email_verify_sent', 3, 60)) {
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans une heure.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
  let dev_verify_link = null;
  if (user && !user.email_verified) {
    try { dev_verify_link = await sendVerificationEmail(user, req); } catch (e) { console.error(e.message); }
  }
  res.json({ success: true, dev_verify_link }); // generic response either way
});

/* ── Step 1–2: request a password reset link ── */
router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requis' });
  if (tooManyRecent(email, 'password_reset_requested', 3, 60)) {
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans une heure.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
  let dev_reset_link = null;
  if (user) {
    const raw = rawToken();
    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
      .run(hashToken(raw), inHours(1), user.id);
    const link = `${appBaseUrl(req)}/reset-password?token=${raw}`;
    const result = await sendMail({
      to: user.email,
      subject: 'KriCar — Réinitialisation de votre mot de passe',
      text: `Vous avez demandé à réinitialiser votre mot de passe.\n\nOuvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe reste inchangé.`,
      html: `<p>Vous avez demandé à réinitialiser votre mot de passe.</p><p>Ouvrez ce lien (valable 1 heure) :</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });
    logEvent(user.id, email, 'password_reset_requested', req);
    if (result.dev) dev_reset_link = link;
  } else {
    logEvent(null, email, 'password_reset_requested', req); // count attempts even for unknown emails
  }
  /* Always generic so we never reveal whether an email is registered. */
  res.json({ success: true, dev_reset_link });
});

/* ── Step 4: set the new password ── */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Jeton et nouveau mot de passe requis' });
  if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });

  const user = db.prepare('SELECT * FROM users WHERE password_reset_token = ?').get(hashToken(token));
  if (!user) return res.status(400).json({ error: 'Lien invalide ou déjà utilisé.' });
  if (user.password_reset_expires && user.password_reset_expires < new Date().toISOString()) {
    return res.status(400).json({ error: 'Lien expiré. Refaites une demande de réinitialisation.' });
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?').run(hash, user.id);
  logEvent(user.id, user.email, 'password_reset_done', req);
  res.json({ success: true });
});

router.put('/me', auth, (req, res) => {
  const { name, phone } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(
    name || req.body.name,
    phone || null,
    req.user.id
  );
  const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
