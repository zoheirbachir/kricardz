/* Agency categories — mirror the type filter on kricar-dz.com/agencies.
   `label` matches the live "Type d'agence" dropdown exactly; `title`/`desc`
   are the shorter copy used on the homepage "Parcourir les agences" tiles. */
export const AGENCY_CATEGORIES = [
  { key: 'classic',      label: 'Location de voitures classiques',         title: 'Voitures classiques',      desc: 'Berlines, citadines et SUV du quotidien.' },
  { key: 'luxury',       label: 'Location de voitures de luxe',            title: 'Voitures de luxe',         desc: 'Berlines premium et sportives haut de gamme.' },
  { key: 'wedding',      label: 'Location de voitures de mariage',         title: 'Voitures de mariage',      desc: 'Voitures décorées pour votre grand jour.' },
  { key: 'bus',          label: 'Location de bus et transport collectif', title: 'Bus & transport collectif', desc: 'Minibus et autocars pour les groupes.' },
  { key: 'construction', label: 'Location de camions de chantier',        title: 'Camions de chantier',      desc: 'Bennes, grues et engins de chantier.' },
  { key: 'trucks',       label: 'Location de camions de transport',       title: 'Camions de transport',     desc: 'Fourgons et poids lourds de transport.' },
];

/* key -> full label, e.g. for badges and the Agencies filter dropdown */
export const AGENCY_TYPE_LABELS = Object.fromEntries(AGENCY_CATEGORIES.map(c => [c.key, c.label]));
