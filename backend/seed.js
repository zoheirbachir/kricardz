const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

const wilayas = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif', 'Tlemcen', 'Béjaïa', 'Tizi Ouzou', 'Batna'];

async function seed() {
  console.log('Seeding database...');

  const hash = await bcrypt.hash('password123', 10);

  const users = [
    { id: uuidv4(), email: 'karim@kricar.dz', name: 'Karim Hadj', phone: '0772345678', role: 'renter' },
    /* ── Real owners, taken from each live kricar-dz.com vehicle page ── */
    { id: uuidv4(), email: 'azdine.benouada@kricar.dz',   name: 'Azdine benouada',    phone: '0557733629', role: 'owner' },
    { id: uuidv4(), email: 'elsaidi.auto@kricar.dz',      name: 'El saidi auto',      phone: '0558125735', role: 'owner' },
    { id: uuidv4(), email: 'cherfaoui.oussama@kricar.dz', name: 'Cherfaoui oussama',  phone: '0770105894', role: 'owner' },
    { id: uuidv4(), email: 'anes.anes@kricar.dz',         name: 'Anes anes',          phone: '0552036419', role: 'owner' },
    { id: uuidv4(), email: 'amine.arabi@kricar.dz',       name: 'Amine arabi',        phone: '0780370177', role: 'owner' },
    { id: uuidv4(), email: 'imad.hadjouti@kricar.dz',     name: 'Imad hadjouti',      phone: '0558967097', role: 'owner' },
    { id: uuidv4(), email: 'abdelloui.ahmed@kricar.dz',   name: 'Abdelloui ahmed',    phone: '0555642480', role: 'owner' },
    { id: uuidv4(), email: 'hasni.location@kricar.dz',    name: 'Hasni location',     phone: '0555555555', role: 'owner' },
    { id: uuidv4(), email: 'badidi.islam@kricar.dz',      name: 'Badidi bouda islam', phone: '0673590224', role: 'owner' },
  ];

  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (!exists) {
      db.prepare('INSERT INTO users (id, email, password_hash, name, phone, role, verified, id_verified, email_verified) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1)').run(
        u.id, u.email, hash, u.name, u.phone, u.role
      );
    }
    /* On a re-seed the user already exists with its original id — use that, otherwise
       agencies/cars would reference the freshly generated uuid and fail the FK check. */
    u.id = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email).id;
  }

  const uid = (email) => users.find((u) => u.email === email).id;
  const reviewer = uid('karim@kricar.dz');

  /* Ensure an administrator account exists — logs in with phone 0553636834 / 0553636834 */
  const adminEmail = 'admin@kricar.dz';
  const adminPhone = '0553636834';
  const adminHash = await bcrypt.hash('0553636834', 10);
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(adminEmail, adminPhone);
  if (!existingAdmin) {
    db.prepare(`INSERT INTO users (id, email, password_hash, name, phone, role, is_admin, verified, id_verified, email_verified, kyc_status)
      VALUES (?, ?, ?, ?, ?, 'admin', 1, 1, 1, 1, 'approved')`).run(uuidv4(), adminEmail, adminHash, 'Administrateur', adminPhone);
  } else {
    db.prepare("UPDATE users SET phone = ?, password_hash = ?, is_admin = 1, role = 'admin', verified = 1, id_verified = 1, email_verified = 1, kyc_status = 'approved' WHERE id = ?")
      .run(adminPhone, adminHash, existingAdmin.id);
  }

  /* Reset all car/agency data so it mirrors the live site exactly (users are kept) */
  db.exec('DELETE FROM reviews');
  db.exec('DELETE FROM favorites');
  db.exec('DELETE FROM car_locations');
  db.exec('DELETE FROM bookings');
  db.exec('DELETE FROM cars');
  db.exec('DELETE FROM agencies');

  /* Only the two real agencies from kricar-dz.com. Every other car owner is an
     individual (a person renting their own car), not an agency. */
  const agencies = [
    { owner: uid('cherfaoui.oussama@kricar.dz'), name: 'Cherfaoui Oussama', type: 'luxury',  wilaya: 'Oran', city: 'Oran', desc: 'Sportives et véhicules haut de gamme, entretien à jour.' },
    { owner: uid('hasni.location@kricar.dz'),    name: 'Hasni Location',    type: 'classic', wilaya: 'Oran', city: 'Oran', desc: 'Votre partenaire de confiance pour la location de voitures.' },
  ];

  for (const a of agencies) {
    db.prepare('INSERT INTO agencies (id, owner_id, name, description, wilaya, city, agency_type, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)').run(
      uuidv4(), a.owner, a.name, a.desc, a.wilaya, a.city, a.type
    );
  }

  /* Real owner of each car, in catalogue order, from its live kricar-dz.com page */
  const carOwnerEmails = [
    'azdine.benouada@kricar.dz',    // Fiat Scudo
    'elsaidi.auto@kricar.dz',       // Citroën C3 2024
    'cherfaoui.oussama@kricar.dz',  // Seat Cupra
    'cherfaoui.oussama@kricar.dz',  // Renault Mégane 4
    'cherfaoui.oussama@kricar.dz',  // Audi S3
    'cherfaoui.oussama@kricar.dz',  // Renault Kangoo
    'anes.anes@kricar.dz',          // Peugeot Bipper
    'amine.arabi@kricar.dz',        // Renault Symbol
    'imad.hadjouti@kricar.dz',      // Fiat 500 hybride
    'abdelloui.ahmed@kricar.dz',    // Citroën C3 2022
    'hasni.location@kricar.dz',     // Renault Clio quatre
    'badidi.islam@kricar.dz',       // Fiat 500
  ];
  const oran = null, alger = null;  // owners are set per-car below from carOwnerEmails

  /* Catalogue exact, calqué sur https://kricar-dz.com/search — photos, vidéos, descriptions,
     caution et kilométrage repris des fiches réelles. Les médias sont servis depuis
     kricar-dz.com (URLs publiques) pour garder le dépôt léger. */
  const U = 'https://kricar-dz.com/uploads/vehicles/';
  const cars = [
    { owner: oran,  title: 'Fiat Scudo',          brand: 'Fiat',    model: 'Scudo',       year: 2024, type: 'minivan',  wilaya: 'Oran',  price: 15000, trans: 'manual',    fuel: 'essence', seats: 7, available: true,  caution: 20000, features: ['Climatisation', 'Bluetooth'], desc: 'Voiture propre et confortable, soyez le bienvenu.', images: [U+'6a26ef4ae577c_1780936522.jpeg', U+'6a26ef4aeffde_1780936522.jpeg'], video: U+'6a26ef4ae84ad_1780936522.mov' },
    { owner: alger, title: 'Citroën C3',          brand: 'Citroën', model: 'C3',          year: 2024, type: 'coupe',    wilaya: 'Alger', price: 9000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation', 'Bluetooth', 'USB'], desc: 'Citadine moderne et confortable, parfaite pour circuler dans Alger.', images: [U+'6a1470814162d_1779724417.jpg'], video: U+'6a14708142e9a_1779724417.mp4' },
    { owner: oran,  title: 'Seat Cupra',          brand: 'Seat',    model: 'Cupra',       year: 2016, type: 'sedan',    wilaya: 'Oran',  price: 9000,  trans: 'automatic', fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation', 'GPS', 'Bluetooth'], desc: 'Voiture sportive, Stage 1 360 chevaux, ligne inox, entretien à jour.', images: [U+'69ee22a25a617_1777214114.jpeg', U+'69ee22a25db80_1777214114.jpeg'], video: U+'69ee22a25a7a5_1777214114.mov' },
    { owner: oran,  title: 'Renault Mégane 4',    brand: 'Renault', model: 'Mégane 4',    year: 2019, type: 'sedan',    wilaya: 'Oran',  price: 9000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation', 'GPS', 'Bluetooth'], desc: 'Voiture confortable, entretien à jour, faible kilométrage.', images: [U+'69ee21ad80cc2_1777213869.jpeg', U+'69ee21ad84936_1777213869.jpeg'], video: U+'69ee21ad80f1a_1777213869.mov' },
    { owner: oran,  title: 'Audi S3',             brand: 'Audi',    model: 'S3',          year: 2020, type: 'sport',    wilaya: 'Oran',  price: 15000, trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation', 'GPS', 'Cuir', 'Bluetooth'], desc: 'Une voiture sportive et confortable, soyez le bienvenu.', images: [U+'69ee20a488f58_1777213604.jpeg', U+'69ee20a48cb4c_1777213604.jpeg'], video: U+'69ee20a4891bd_1777213604.mov' },
    { owner: oran,  title: 'Renault Kangoo',      brand: 'Renault', model: 'Kangoo',      year: 2013, type: 'citadine', wilaya: 'Oran',  price: 7000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation'], desc: 'Une voiture avec chauffage et climatiseur, confortable, soyez les bienvenus.', images: [U+'69ed27c516e38_1777149893.jpeg', U+'69ed27c51b00c_1777149893.jpeg'], video: U+'69ed27c517022_1777149893.mov' },
    { owner: oran,  title: 'Peugeot Bipper',      brand: 'Peugeot', model: 'Bipper',      year: 2013, type: 'citadine', wilaya: 'Oran',  price: 6000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation'], desc: 'Une voiture confortable avec climatiseur et chauffage, soyez les bienvenus.', images: [U+'69ecf0977d840_1777135767.jpeg', U+'69ecf0979314e_1777135767.jpeg'], video: U+'69ecf0977f18f_1777135767.mov' },
    { owner: oran,  title: 'Renault Symbol',      brand: 'Renault', model: 'Symbol',      year: 2019, type: 'citadine', wilaya: 'Oran',  price: 6000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 20000, features: ['Climatisation', 'Bluetooth'], desc: 'Une voiture confortable, soyez les bienvenus.', images: [U+'69ecee928dd92_1777135250.jpeg', U+'69ecee929e0bb_1777135250.jpeg'], video: U+'69ecee928f75f_1777135250.mov' },
    { owner: oran,  title: 'Fiat 500 hybride',    brand: 'Fiat',    model: '500 hybride', year: 2024, type: 'citadine', wilaya: 'Oran',  price: 7000,  trans: 'manual',    fuel: 'essence', seats: 4, available: true,  caution: 20000, features: ['Climatisation', 'Bluetooth', 'Hybride'], desc: 'Mini-citadine hybride. Bienvenue.', images: [U+'69ebc4d9c4f25_1777059033.jpeg'], video: U+'69ebc4d9c6781_1777059033.mov' },
    { owner: alger, title: 'Citroën C3',          brand: 'Citroën', model: 'C3',          year: 2022, type: 'citadine', wilaya: 'Alger', price: 8000,  trans: 'manual',    fuel: 'essence', seats: 5, available: true,  caution: 50000, features: ['Climatisation', 'Bluetooth'], desc: 'Citadine récente, confortable et économique. Bienvenue 🤗', images: [U+'69ebc079c82a4_1777057913.jpeg', U+'69ebc079d9628_1777057913.jpeg'], video: U+'69ebc079c920b_1777057913.mov' },
    { owner: oran,  title: 'Renault Clio quatre', brand: 'Renault', model: 'Clio quatre', year: 2019, type: 'sedan',    wilaya: 'Oran',  price: 8000,  trans: 'manual',    fuel: 'diesel',  seats: 5, available: false, caution: 20000, features: ['Climatisation', 'GPS', 'Bluetooth'], desc: 'Une Clio quatre propre, avec chauffage, climatiseur et suspension.', images: [U+'69e7b38ed5916_1776792462.jpeg'], video: U+'69e7b38ed5cc8_1776792462.mov' },
    { owner: oran,  title: 'Fiat 500',            brand: 'Fiat',    model: '500',         year: 2024, type: 'citadine', wilaya: 'Oran',  price: 7000,  trans: 'manual',    fuel: 'essence', seats: 4, available: false, caution: 50000, features: ['Climatisation', 'Bluetooth'], desc: 'Une voiture confortable avec chauffage et climatiseur.', images: [U+'69dd535b5dd17_1776112475.jpeg'], video: U+'69dd535b5e096_1776112475.mp4' },
  ];

  cars.forEach((c, i) => {
    const id = uuidv4();
    /* Descending timestamps keep the search results in the same order as the live page */
    const createdAt = new Date(Date.now() - i * 1000).toISOString().slice(0, 19).replace('T', ' ');
    db.prepare(`INSERT INTO cars (id, owner_id, title, brand, model, year, type, wilaya, city, price_per_day, description, features, images, seats, transmission, fuel,
      caution, km_per_day, extra_km_price, with_driver, video_url, available, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  ?, ?, ?, ?, ?,  ?, 1, ?)`).run(
      id, uid(carOwnerEmails[i]), c.title, c.brand, c.model, c.year, c.type, c.wilaya, c.city || null,
      c.price, c.desc, JSON.stringify(c.features), JSON.stringify(c.images || []),
      c.seats, c.trans, c.fuel,
      c.caution, 300, 10, 0, c.video || null,
      c.available ? 1 : 0, createdAt
    );

    db.prepare('INSERT INTO reviews (id, car_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), id, reviewer, 5, 'Excellent véhicule, propriétaire très sympa !'
    );
    db.prepare('INSERT INTO reviews (id, car_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), id, reviewer, 4, 'Bon état général, je recommande.'
    );
  });

  /* Merge the original CRICAR (v1) database export on top of the showcase seed. */
  try { require('./db/v1data').seedV1(db); } catch (e) { console.error('v1 merge failed:', e.message); }

  console.log('Seed complete!');
  process.exit(0);
}

/* Seeding must never block the API from starting. On any failure we log it and
   exit 0 so the `node seed.js && node server.js` boot chain still launches the server. */
seed().catch((e) => {
  console.error('Seed failed (continuing to start server anyway):', e);
  process.exit(0);
});
