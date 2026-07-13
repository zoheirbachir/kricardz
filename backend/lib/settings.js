const db = require('../db/database');

/* Small key/value settings store, backed by the app_settings table.
   Defaults live here so the app works before an admin ever edits anything;
   an admin override in the DB always wins. */
const DEFAULTS = {
  kricar_name: 'DzKricar (CRICAR)',
  kricar_legal_name: 'DzKricar — Plateforme de location de véhicules',
  kricar_commercial_reg_number: 'EN COURS',
  kricar_address: 'Algérie',
  kricar_phone: '0673590224',
  kricar_email: 'Kricar.services@gmail.com',
};

/* The keys an admin is allowed to read/write through the settings API. */
const EDITABLE_KEYS = Object.keys(DEFAULTS);

function get(key) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  if (row && row.value != null && row.value !== '') return row.value;
  return DEFAULTS[key] ?? null;
}

function set(key, value) {
  db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(key, value == null ? '' : String(value));
}

/* All editable settings (with defaults filled in) — for the admin settings screen. */
function all() {
  const out = {};
  for (const k of EDITABLE_KEYS) out[k] = get(k);
  return out;
}

/* DzKricar's own identity block, as embedded into every electronic contract/stamp. */
function kricarInfo() {
  return {
    name: get('kricar_name'),
    legal_name: get('kricar_legal_name'),
    commercial_reg_number: get('kricar_commercial_reg_number'),
    address: get('kricar_address'),
    phone: get('kricar_phone'),
    email: get('kricar_email'),
  };
}

module.exports = { get, set, all, kricarInfo, EDITABLE_KEYS, DEFAULTS };
