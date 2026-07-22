const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { auth, adminAuth } = require('../middleware/auth');
const legal = require('../lib/legal');

const router = express.Router();

const LANGS = ['fr', 'ar', 'en'];
const pickLang = (l) => (LANGS.includes(l) ? l : 'fr');

/* ── PUBLIC: terms in force, readable without logging in ── */
router.get('/current', (req, res) => {
  const t = legal.currentTerms();
  if (!t) return res.status(404).json({ error: 'Aucune version publiée.' });
  const lang = pickLang(req.query.lang);
  res.json({
    version: t.version,
    lang,
    content: t[`content_${lang}`] || t.content_fr,
    published_at: t.published_at,
    /* all languages so the page can switch without a round-trip */
    contents: { fr: t.content_fr, ar: t.content_ar, en: t.content_en },
  });
});

/* ── ADMIN: version management ── */
router.get('/versions', adminAuth, (req, res) => {
  res.json(db.prepare('SELECT id, version, published, created_at, published_at FROM terms_versions ORDER BY created_at DESC').all()
    .map(v => ({ ...v, published: Boolean(v.published) })));
});

router.get('/versions/:id', adminAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Version introuvable' });
  res.json({ ...v, published: Boolean(v.published) });
});

/* Create a new version. Publishing it makes every user re-accept (their stored
   terms_version no longer matches the one in force). */
router.post('/versions', adminAuth, (req, res) => {
  const { version, content_fr, content_ar, content_en, publish } = req.body || {};
  if (!version || !String(version).trim()) return res.status(400).json({ error: 'Numéro de version requis.' });
  if (!content_fr && !content_ar && !content_en) return res.status(400).json({ error: 'Le contenu est requis.' });
  const exists = db.prepare('SELECT id FROM terms_versions WHERE version = ?').get(String(version).trim());
  if (exists) return res.status(409).json({ error: 'Cette version existe déjà.' });

  const id = uuidv4();
  db.prepare(`INSERT INTO terms_versions (id, version, content_fr, content_ar, content_en, published, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, String(version).trim(), content_fr || null, content_ar || null, content_en || null,
    publish ? 1 : 0, publish ? new Date().toISOString() : null
  );
  res.status(201).json(db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(id));
});

/* Edit a draft (or fix wording on a published version). */
router.put('/versions/:id', adminAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Version introuvable' });
  const { content_fr, content_ar, content_en } = req.body || {};
  db.prepare('UPDATE terms_versions SET content_fr = ?, content_ar = ?, content_en = ? WHERE id = ?').run(
    content_fr !== undefined ? content_fr : v.content_fr,
    content_ar !== undefined ? content_ar : v.content_ar,
    content_en !== undefined ? content_en : v.content_en,
    v.id
  );
  res.json(db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(v.id));
});

router.post('/versions/:id/publish', adminAuth, (req, res) => {
  const v = db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Version introuvable' });
  db.prepare("UPDATE terms_versions SET published = 1, published_at = datetime('now') WHERE id = ?").run(v.id);
  res.json({ ok: true, version: v.version });
});

/* ── Accept the version currently in force (used after a new version is published) ── */
router.post('/accept', auth, (req, res) => {
  const t = legal.currentTerms();
  if (!t) return res.status(409).json({ error: 'Aucune version publiée.' });
  const row = legal.recordConsent(req, req.user.id, { context: req.body?.context || 'reaccept' });
  if (!row) return res.status(500).json({ error: "Échec de l'enregistrement du consentement." });
  res.json({ ok: true, version: t.version, accepted_at: row.created_at });
});

/* ── ADMIN: consent audit trail (evidence for disputes) ── */
router.get('/consents', adminAuth, (req, res) => {
  const { booking_id, user_id } = req.query;
  let q = `SELECT c.*, u.name AS user_name, u.email AS user_email
           FROM consents c JOIN users u ON c.user_id = u.id WHERE 1=1`;
  const p = [];
  if (booking_id) { q += ' AND c.booking_id = ?'; p.push(booking_id); }
  if (user_id) { q += ' AND c.user_id = ?'; p.push(user_id); }
  q += ' ORDER BY c.created_at DESC LIMIT 500';
  res.json(db.prepare(q).all(...p));
});

module.exports = router;
