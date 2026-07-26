import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

/* The dynamic category list is the same everywhere, so fetch it once and share
   it across every picker/filter. Refreshed on a full reload (admin changes are
   rare and the reload picks them up). */
let cache = null;
let inflight = null;

function fetchCategories() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.get('/categories')
      .then(r => { cache = r.data || []; return cache; })
      .catch(() => { cache = []; return cache; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/* Returns { categories, loading, label(cat) } where label resolves the row to
   the current UI language. `cat` may be a category object or a slug. */
export function useCategories() {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    fetchCategories().then(list => { if (alive) { setCategories(list); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const lang = ['fr', 'ar', 'en'].includes(i18n.language) ? i18n.language : 'fr';
  const bySlug = Object.fromEntries(categories.map(c => [c.slug, c]));

  const label = (cat) => {
    const c = typeof cat === 'string' ? bySlug[cat] : cat;
    if (!c) return typeof cat === 'string' ? cat : '';
    return c[`label_${lang}`] || c.label_fr || c.slug;
  };

  return { categories, loading, label };
}
