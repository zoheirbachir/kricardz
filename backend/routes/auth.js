const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kricar_secret_2024';

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
      driving_license_issued_date, driving_license_expiry_date, lessor_type,
      agency_legal_name, agency_commercial_reg_number,
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
         driving_license_issued_date, driving_license_expiry_date, agency_legal_name, agency_commercial_reg_number, kyc_docs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, email, hash, name, phone || null, safeRole,
      submittedKyc ? 'pending' : 'none',
      lessor_type || null,
      secondary_document_type || document_type || null,
      document_number || null,
      driving_license_issued_date || null,
      driving_license_expiry_date || null,
      agency_legal_name || null,
      agency_commercial_reg_number || null,
      JSON.stringify(docs)
    );

    const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, kyc_status, is_admin FROM users WHERE id = ?').get(id);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });
  if (user.banned === 1) return res.status(403).json({ error: 'Ce compte a été bloqué par un administrateur.' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, avatar, role, verified, id_verified, kyc_status, kyc_rejection_reason, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
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
