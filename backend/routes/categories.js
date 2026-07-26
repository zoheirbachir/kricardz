const express = require('express');
const { randomUUID } = require('node:crypto');
const db = require('../db/database');
const { adminAuth } = require('../middleware/auth');
const categories = require('../lib/categories');

const router = express.Router();

const slugify = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/* ── PUBLIC: the active categories, for registration/car forms and filters ── */
router.get('/', (req, res) => {
  res.json(categories.list({ activeOnly: true }).map(({ id, slug, label_fr, label_ar, label_en }) =>
    ({ id, slug, label_fr, label_ar, label_en })));
});

/* ── ADMIN: full management ── */
router.get('/all', adminAuth, (req, res) => {
  const rows = categories.list();
  const counts = db.prepare('SELECT category, COUNT(*) AS n FROM cars GROUP BY category').all()
    .reduce((m, r) => { m[r.category] = r.n; return m; }, {});
  res.json(rows.map(c => ({ ...c, cars: counts[c.slug] || 0 })));
});

router.post('/', adminAuth, (req, res) => {
  const { label_fr, label_ar, label_en } = req.body || {};
  if (!label_fr || !String(label_fr).trim()) return res.status(400).json({ error: 'Le nom (français) est requis.' });
  let slug = slugify(req.body.slug || label_en || label_fr);
  if (!slug) return res.status(400).json({ error: 'Nom invalide.' });
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà.' });
  }
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories').get().m;
  const id = randomUUID();
  db.prepare(`INSERT INTO categories (id, slug, label_fr, label_ar, label_en, sort_order, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)`).run(
    id, slug, String(label_fr).trim(), label_ar || null, label_en || null, max + 1);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

router.put('/:id', adminAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Catégorie introuvable.' });
  const { label_fr, label_ar, label_en, active } = req.body || {};
  db.prepare(`UPDATE categories SET label_fr = ?, label_ar = ?, label_en = ?, active = ? WHERE id = ?`).run(
    label_fr !== undefined ? String(label_fr).trim() : c.label_fr,
    label_ar !== undefined ? (label_ar || null) : c.label_ar,
    label_en !== undefined ? (label_en || null) : c.label_en,
    active !== undefined ? (active ? 1 : 0) : c.active,
    c.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(c.id));
});

router.delete('/:id', adminAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Catégorie introuvable.' });
  /* Don't orphan listings: a category still used by cars can be disabled but not
     deleted, so existing cars keep a valid label. */
  const used = db.prepare('SELECT COUNT(*) AS n FROM cars WHERE category = ?').get(c.slug).n;
  if (used > 0) {
    return res.status(409).json({ error: `Catégorie utilisée par ${used} véhicule(s). Désactivez-la au lieu de la supprimer.` });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(c.id);
  res.json({ ok: true });
});

/* Reorder: body { order: [id, id, ...] } sets sort_order to the array index. */
router.post('/reorder', adminAuth, (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : null;
  if (!order) return res.status(400).json({ error: 'Ordre invalide.' });
  const upd = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  order.forEach((id, i) => upd.run(i, id));
  res.json({ ok: true });
});

module.exports = router;
