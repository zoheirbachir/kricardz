/*
 * Promote an account to administrator (or create one).
 *
 *   node make-admin.js                      -> ensures admin@kricar.dz / password123
 *   node make-admin.js someone@email.dz     -> promotes an existing user
 *   node make-admin.js new@email.dz pass123  -> creates + promotes a new admin
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

async function main() {
  const email = (process.argv[2] || 'admin@kricar.dz').toLowerCase();
  const password = process.argv[3] || 'password123';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing) {
    db.prepare("UPDATE users SET is_admin = 1, role = 'admin', verified = 1, id_verified = 1, kyc_status = 'approved' WHERE id = ?").run(existing.id);
    console.log(`✓ Promoted existing user to admin: ${email}`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role, is_admin, verified, id_verified, kyc_status)
      VALUES (?, ?, ?, ?, 'admin', 1, 1, 1, 'approved')`).run(
      uuidv4(), email, hash, 'Administrateur'
    );
    console.log(`✓ Created admin account: ${email} / ${password}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
