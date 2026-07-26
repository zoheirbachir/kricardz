/* Backwards-compatible shim.

   Categories used to be a hard-coded list here. They are now a dynamic taxonomy
   managed from the admin panel (see lib/categories.js and the `categories` table).
   These wrappers keep the old call sites (auth, agencies, cars) working while
   validating against the live, admin-managed list instead of a frozen array. */
const categories = require('./categories');

/* An agency's declared activities — keep only known, active category slugs. */
const parseServiceTypes = (value) => categories.parseCategories(value);

/* A car's single category — validated against the active list, with a safe fallback. */
const cleanCategory = (value, opts) => categories.cleanCategory(value, opts);

module.exports = { parseServiceTypes, cleanCategory };
