/* The activities an agency/owner can declare. The key is stored; the client
   renders the label from its i18n files (services.<key>). Keep this list in sync
   with frontend/src/i18n/*.json → "services". */
const SERVICE_TYPES = [
  'economy',         // voitures économiques
  'luxury',          // voitures de luxe
  'wedding',         // voitures de mariage
  'with_driver',     // location avec chauffeur
  'taxi',            // taxi
  'airport_transfer',// transfert aéroport
  'bus',             // minibus et bus
  'truck',           // camions
  'moto',            // motos
  'quad',            // quad
  'jet_ski',         // jet ski
  'boat',            // bateaux et yachts
  'camping_car',     // camping-cars
  'other',           // autres services
];

const SET = new Set(SERVICE_TYPES);

/* Normalise arbitrary input (array or JSON string) into a clean, de-duplicated,
   validated array of known keys. Returns [] for anything unusable. */
function parseServiceTypes(value) {
  let arr = value;
  if (typeof value === 'string') {
    try { arr = JSON.parse(value); } catch { arr = value.split(',').map(s => s.trim()); }
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter(v => SET.has(v)))];
}

module.exports = { SERVICE_TYPES, parseServiceTypes };
