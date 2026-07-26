const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { sendMail, isDevMail } = require('../lib/mailer');
const legal = require('../lib/legal');
const { sendSms } = require('../lib/sms');
const { makeUploader, uploadErrorHandler, DOC_TYPES, IMAGE_TYPES } = require('../lib/uploads');
const { PRIVATE_UPLOADS_ROOT, AVATARS_DIR } = require('../config/paths');
const { notifyAdmins } = require('../lib/notify');
const { parseServiceTypes } = require('../lib/serviceTypes');

const router = express.Router();
const JWT_SECRET = require('../config/secret');
const isProd = process.env.NODE_ENV === 'production';

/* ── Token + audit helpers (email verification & password reset) ── */
const rawToken = () => crypto.randomBytes(32).toString('hex');
const rawOtp = () => String(crypto.randomInt(100000, 1000000)); // 6-digit code
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');
const inHours = (h) => new Date(Date.now() + h * 3600000).toISOString();
const inMinutes = (m) => new Date(Date.now() + m * 60000).toISOString();

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

/* In-memory login throttle, keyed by IP. Render free tier is single-instance so a
   Map suffices; use a shared store (Redis) if you ever run multiple instances. */
const loginHits = new Map();
function loginThrottle(ip, max = 15, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const rec = loginHits.get(ip);
  if (!rec || now - rec.first > windowMs) { loginHits.set(ip, { count: 1, first: now }); return true; }
  rec.count++;
  return rec.count <= max;
}
const loginThrottleReset = (ip) => loginHits.delete(ip);

async function sendVerificationEmail(user, req) {
  const raw = rawToken();
  db.prepare('UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?')
    .run(hashToken(raw), inHours(24), user.id);
  const link = `${appBaseUrl(req)}/verify-email?token=${raw}`;
  const result = await sendMail({
    to: user.email,
    subject: 'DzKricar — Confirmez votre adresse email',
    text: `Bienvenue sur DzKricar !\n\nConfirmez votre adresse email en ouvrant ce lien (valable 24h) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: `<p>Bienvenue sur <b>DzKricar</b> !</p><p>Confirmez votre adresse email (lien valable 24h) :</p><p><a href="${link}">Confirmer mon adresse email</a></p><p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`,
  });
  logEvent(user.id, user.email, 'email_verify_sent', req);
  /* Only ever surface the link in the API response in non-production dev mode.
     In production without a mail provider, nothing is returned (fix the provider). */
  return (result.dev && !isProd) ? link : null;
}

/* ── KYC file uploads ──
   Identity docs go to a PRIVATE folder OUTSIDE ../uploads, so express.static never
   serves them. They're retrieved only through the authenticated /kyc-file route. */
/* MUST hang off PRIVATE_UPLOADS_ROOT: on Hostinger the deploy replaces the whole
   app folder, so anything written inside backend/ is destroyed on every deploy.
   This used to be hardcoded to ../private_uploads/kyc and every redeploy silently
   deleted every identity document ever uploaded. LEGACY_KYC_DIR is still read from
   so any file that survived is still served. */
const KYC_DIR = path.join(PRIVATE_UPLOADS_ROOT, 'kyc');
const LEGACY_KYC_DIR = path.join(__dirname, '../private_uploads/kyc');
try { fs.mkdirSync(KYC_DIR, { recursive: true }); } catch { /* ignore */ }

/* Rescue anything still sitting in the old in-app folder (a restart without a
   redeploy, or an upgrade on a host that doesn't wipe). Runs once at boot. */
function migrateLegacyKyc() {
  try {
    if (KYC_DIR === LEGACY_KYC_DIR || !fs.existsSync(LEGACY_KYC_DIR)) return;
    let moved = 0;
    for (const f of fs.readdirSync(LEGACY_KYC_DIR)) {
      const from = path.join(LEGACY_KYC_DIR, f);
      const to = path.join(KYC_DIR, f);
      if (fs.statSync(from).isFile() && !fs.existsSync(to)) { fs.copyFileSync(from, to); moved++; }
    }
    if (moved) console.log(`Migrated ${moved} KYC file(s) to the persistent folder.`);
  } catch (e) {
    console.error('KYC migration failed:', e.message);
  }
}
migrateLegacyKyc();
const upload = makeUploader({ dir: KYC_DIR, allow: DOC_TYPES, maxMB: 8 });
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

/* Which of a user's stored documents no longer exist on disk. Files uploaded
   before the storage fix were wiped by each redeploy, so the database still
   points at files that are gone — the owner must send them again. */
function missingKycFiles(kycDocsJson) {
  let docs = {};
  try { docs = JSON.parse(kycDocsJson || '{}'); } catch { return []; }
  return Object.entries(docs)
    .filter(([, p]) => {
      if (!p) return false;
      const name = String(p).split('/').pop();
      return ![path.join(KYC_DIR, name), path.join(LEGACY_KYC_DIR, name)].some(f => fs.existsSync(f));
    })
    .map(([field]) => field);
}

/* ── Re-upload identity documents ──
   Documents could previously only be sent at registration, so a user whose files
   were lost had no way to restore their account. Any authenticated user can now
   replace them; doing so puts the file back under review. */
router.post('/kyc-documents', auth, upload.fields(KYC_FIELDS), (req, res) => {
  const me = db.prepare('SELECT kyc_docs, kyc_status FROM users WHERE id = ?').get(req.user.id);
  if (!me) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const files = req.files || {};
  const incoming = {};
  for (const f of KYC_FIELDS) {
    if (files[f.name]?.[0]) incoming[f.name] = `/api/auth/kyc-file/${files[f.name][0].filename}`;
  }
  if (!Object.keys(incoming).length) {
    return res.status(400).json({ error: 'Aucun document envoyé.' });
  }

  let current = {};
  try { current = JSON.parse(me.kyc_docs || '{}'); } catch { current = {}; }
  const merged = { ...current, ...incoming };

  db.prepare(`UPDATE users SET kyc_docs = ?, kyc_status = 'pending',
              kyc_rejection_reason = NULL, kyc_reviewed_at = NULL WHERE id = ?`)
    .run(JSON.stringify(merged), req.user.id);

  /* Put it back in the admin review queue. */
  const who = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id)?.name;
  notifyAdmins(req.app.get('io'), {
    type: 'kyc',
    title: 'Documents à vérifier',
    body: `${who || 'Un utilisateur'} a envoyé de nouveaux documents d'identité.`,
    link: '/admin/kyc',
  });

  res.json({ ok: true, uploaded: Object.keys(incoming), kyc_status: 'pending', missing: missingKycFiles(JSON.stringify(merged)) });
});

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
    /* Legal: the account cannot be created without accepting the terms in force. */
    const acceptTerms = req.body.accept_terms;
    if (!(acceptTerms === true || acceptTerms === 'true' || acceptTerms === '1' || acceptTerms === 1)) {
      return res.status(400).json({ error: 'Vous devez lire et accepter les conditions générales pour créer un compte.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) return res.status(409).json({ error: 'Email déjà utilisé' });

    /* Collect uploaded document paths */
    const files = req.files || {};
    const docs = {};
    for (const f of KYC_FIELDS) {
      if (files[f.name] && files[f.name][0]) docs[f.name] = `/api/auth/kyc-file/${files[f.name][0].filename}`;
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const safeRole = (role === 'owner' || role === 'lessor') ? 'owner' : 'renter';
    const submittedKyc = Object.keys(docs).length > 0;
    /* Activities the agency offers — only meaningful for owners. */
    const serviceTypes = safeRole === 'owner' ? parseServiceTypes(req.body.service_types) : [];

    db.prepare(`
      INSERT INTO users
        (id, email, password_hash, name, phone, role,
         kyc_status, lessor_type, document_type, document_number,
         driving_license_number, driving_license_issued_date, driving_license_expiry_date,
         agency_legal_name, agency_commercial_reg_number, agency_address, national_id_number, kyc_docs, service_types)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(docs),
      JSON.stringify(serviceTypes)
    );

    /* An agency needs a row in the `agencies` table to appear in the partner
       network and the admin Agences list — registration used to create the user
       only, so agencies never showed up. Individuals list cars without an agency
       profile, so this is agency-only. */
    if (lessor_type === 'agency') {
      try {
        const agWilaya = (req.body.agency_wilaya || '').toString().trim() || '—';
        const agCity = (req.body.agency_city || '').toString().trim() || null;
        db.prepare(`INSERT INTO agencies (id, owner_id, name, description, wilaya, city, phone, email)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
          uuidv4(), id, agency_legal_name || name, agency_address || null, agWilaya, agCity, phone || null, email);
      } catch (e) { console.error('agency row create failed:', e.message); }
    }

    /* Legal audit trail: who accepted which version, when, from where. */
    legal.recordConsent(req, id, { context: 'signup' });

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, email_verified, kyc_status, is_admin, approved, terms_version FROM users WHERE id = ?').get(id);

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
  const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString();
  if (!loginThrottle(ip)) return res.status(429).json({ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });

  const { email, password } = req.body;
  const identifier = (email || '').trim();
  if (!identifier || !password) return res.status(400).json({ error: 'Email/téléphone et mot de passe requis' });

  /* The login field accepts either an email or a phone number */
  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier, identifier);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });
  if (user.banned === 1) return res.status(403).json({ error: 'Ce compte a été bloqué par un administrateur.' });

  loginThrottleReset(ip); // successful login clears the counter for this IP
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  /* Same re-acceptance signal as /me, so the prompt appears right after login. */
  const currentTerms = legal.currentTerms();
  safeUser.terms_current_version = currentTerms?.version || null;
  safeUser.terms_reaccept_required = Boolean(currentTerms && safeUser.terms_version !== currentTerms.version);
  res.json({ token, user: safeUser });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, email_verified, kyc_status, kyc_rejection_reason, is_admin, approved, approval_reason, terms_version, terms_accepted_at, lessor_type, service_types, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  user.service_types = parseServiceTypes(user.service_types);
  /* Signals the client to prompt for re-acceptance after a new version is published. */
  const current = legal.currentTerms();
  user.terms_current_version = current?.version || null;
  user.terms_reaccept_required = Boolean(current && user.terms_version !== current.version);
  /* Documents whose file was destroyed by a pre-fix redeploy — the client shows
     a banner asking the user to send them again. */
  const docs = db.prepare('SELECT kyc_docs FROM users WHERE id = ?').get(req.user.id)?.kyc_docs;
  user.kyc_files_missing = missingKycFiles(docs);
  res.json(user);
});

/* ── Serve a private KYC document ──
   Only an admin, or the user who owns the file, may fetch it. The JWT can come from
   the Authorization header OR a ?token= query param (so <img src> can load it). */
router.get('/kyc-file/:name', (req, res) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });

  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const token = bearer || req.query.token;
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Token invalide' }); }

  const me = db.prepare('SELECT is_admin, kyc_docs FROM users WHERE id = ?').get(payload.id);
  if (!me) return res.status(401).json({ error: 'Non autorisé' });

  let authorized = me.is_admin === 1;
  if (!authorized) {
    try { authorized = Object.values(JSON.parse(me.kyc_docs || '{}')).some(p => p.endsWith('/' + name)); } catch { /* ignore */ }
  }
  /* An agency/owner may view a client's registration documents when that client
     has a (non-cancelled) booking on one of the agency's cars. */
  if (!authorized) {
    const fileOwner = db.prepare('SELECT id FROM users WHERE kyc_docs LIKE ?').get('%' + name + '%');
    if (fileOwner) {
      const booking = db.prepare(`
        SELECT 1 FROM bookings b JOIN cars c ON b.car_id = c.id
        WHERE b.renter_id = ? AND c.owner_id = ? AND b.status != 'cancelled' LIMIT 1
      `).get(fileOwner.id, payload.id);
      if (booking) authorized = true;
    }
  }
  if (!authorized) return res.status(403).json({ error: 'Accès refusé' });

  /* Persistent folder first, then the pre-fix in-app folder. */
  const file = [path.join(KYC_DIR, name), path.join(LEGACY_KYC_DIR, name)].find(p => fs.existsSync(p));
  if (!file) {
    return res.status(404).json({
      error: "Document introuvable. Le fichier n'est plus sur le serveur — demandez à l'utilisateur de le téléverser à nouveau.",
      code: 'file_missing',
    });
  }
  res.sendFile(file);
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
      subject: 'DzKricar — Réinitialisation de votre mot de passe',
      text: `Vous avez demandé à réinitialiser votre mot de passe.\n\nOuvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe reste inchangé.`,
      html: `<p>Vous avez demandé à réinitialiser votre mot de passe.</p><p>Ouvrez ce lien (valable 1 heure) :</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p style="color:#888;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });
    logEvent(user.id, email, 'password_reset_requested', req);
    if (result.dev && !isProd) dev_reset_link = link;
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

/* ── Password reset by SMS (for phone-registered users) ──
   Step 1: request a 6-digit code sent to the phone. */
router.post('/forgot-password-sms', async (req, res) => {
  const phone = (req.body.phone || '').trim();
  if (!phone) return res.status(400).json({ error: 'Numéro de téléphone requis' });
  if (tooManyRecent(phone, 'sms_reset_requested', 3, 60)) {
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans une heure.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  let dev_code = null;
  if (user) {
    const code = rawOtp();
    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
      .run(hashToken(code), inMinutes(10), user.id);
    const result = await sendSms({
      to: phone,
      body: `DzKricar : votre code de réinitialisation est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`,
    });
    logEvent(user.id, phone, 'sms_reset_requested', req);
    if (result.dev && !isProd) dev_code = code; // dev only — never leak the code in prod
  } else {
    logEvent(null, phone, 'sms_reset_requested', req); // count even unknown numbers
  }
  /* Generic response so we never reveal whether a number is registered. */
  res.json({ success: true, dev_code });
});

/* Step 2: verify the code + set the new password. */
router.post('/reset-password-sms', async (req, res) => {
  const phone = (req.body.phone || '').trim();
  const { code, password } = req.body;
  if (!phone || !code || !password) return res.status(400).json({ error: 'Numéro, code et mot de passe requis' });
  if (password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !user.password_reset_token) return res.status(400).json({ error: 'Code invalide ou expiré. Refaites une demande.' });
  if (user.password_reset_expires && user.password_reset_expires < new Date().toISOString()) {
    return res.status(400).json({ error: 'Code expiré. Refaites une demande.' });
  }
  /* Brute-force guard: after 5 wrong tries in 15 min, invalidate the code. */
  if (tooManyRecent(phone, 'sms_reset_failed', 5, 15)) {
    db.prepare('UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?').run(user.id);
    return res.status(429).json({ error: 'Trop de tentatives. Refaites une demande de code.' });
  }
  if (hashToken(code) !== user.password_reset_token) {
    logEvent(user.id, phone, 'sms_reset_failed', req);
    return res.status(400).json({ error: 'Code incorrect.' });
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?').run(hash, user.id);
  logEvent(user.id, phone, 'sms_reset_done', req);
  res.json({ success: true });
});

router.put('/me', auth, (req, res) => {
  const current = db.prepare('SELECT name, phone, role FROM users WHERE id = ?').get(req.user.id);
  const { name, phone } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(
    name || current.name,
    phone !== undefined ? (phone || null) : current.phone,
    req.user.id
  );
  /* Owners can update the activities they offer. */
  if (current.role === 'owner' && req.body.service_types !== undefined) {
    db.prepare('UPDATE users SET service_types = ? WHERE id = ?')
      .run(JSON.stringify(parseServiceTypes(req.body.service_types)), req.user.id);
  }
  const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, service_types FROM users WHERE id = ?').get(req.user.id);
  user.service_types = parseServiceTypes(user.service_types);
  res.json(user);
});

/* ── Profile picture (avatar) ──
   Available to every account. The image is public (shown on listings and reviews),
   so it lives under /uploads/avatars/. Uploading replaces any previous one. */
const avatarUpload = makeUploader({ dir: AVATARS_DIR, allow: IMAGE_TYPES, maxMB: 5 });

router.post('/avatar', auth, avatarUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucune image envoyée.' });
  const current = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
  const avatar = `/uploads/avatars/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
  /* Best-effort delete of the previous file so avatars don't pile up. */
  if (current?.avatar?.startsWith('/uploads/avatars/')) {
    try { fs.unlinkSync(path.join(AVATARS_DIR, path.basename(current.avatar))); } catch { /* ignore */ }
  }
  res.json({ avatar });
});

router.delete('/avatar', auth, (req, res) => {
  const current = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id);
  db.prepare('UPDATE users SET avatar = NULL WHERE id = ?').run(req.user.id);
  if (current?.avatar?.startsWith('/uploads/avatars/')) {
    try { fs.unlinkSync(path.join(AVATARS_DIR, path.basename(current.avatar))); } catch { /* ignore */ }
  }
  res.json({ ok: true });
});

/* Turn rejected/oversized KYC uploads into a clean 400 */
router.use(uploadErrorHandler);

module.exports = router;
