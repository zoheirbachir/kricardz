const db = require('../db/database');

/* The dynamic category taxonomy (managed from Admin). One source of truth for
   the agency activity picker (multi) and the per-car category (single). */

function list({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE active = 1' : '';
  return db.prepare(`SELECT id, slug, label_fr, label_ar, label_en, sort_order, active
    FROM categories ${where} ORDER BY sort_order ASC, label_fr ASC`).all()
    .map(c => ({ ...c, active: Boolean(c.active) }));
}

/* Slugs currently offered to users (active only). */
function activeSlugs() {
  return new Set(db.prepare('SELECT slug FROM categories WHERE active = 1').all().map(r => r.slug));
}

/* Every known slug (active or not) — used to keep already-stored values valid
   even if the admin later disables a category. */
function allSlugs() {
  return new Set(db.prepare('SELECT slug FROM categories').all().map(r => r.slug));
}

/* A car must have exactly one category. Falls back to the first active one so a
   listing is never left with an invalid/empty category. */
function cleanCategory(value, { current = null } = {}) {
  const active = activeSlugs();
  if (value && active.has(value)) return value;
  if (current && allSlugs().has(current)) return current;   // keep an existing value on edit
  const first = db.prepare('SELECT slug FROM categories WHERE active = 1 ORDER BY sort_order ASC LIMIT 1').get();
  return first?.slug || 'car';
}

/* An agency may declare one or more categories. Accepts an array or JSON string,
   keeps only known active slugs, de-duplicated. */
function parseCategories(value) {
  let arr = value;
  if (typeof value === 'string') {
    try { arr = JSON.parse(value); } catch { arr = value.split(',').map(s => s.trim()); }
  }
  if (!Array.isArray(arr)) return [];
  const active = activeSlugs();
  return [...new Set(arr.filter(v => active.has(v)))];
}

module.exports = { list, activeSlugs, allSlugs, cleanCategory, parseCategories };
