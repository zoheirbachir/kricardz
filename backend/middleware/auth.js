const jwt = require('jsonwebtoken');
const db = require('../db/database');
const JWT_SECRET = process.env.JWT_SECRET || 'kricar_secret_2024';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {}
  }
  next();
}

/* Requires a valid token AND that the account is an administrator.
   Checks the DB (not just the JWT) so promotions take effect without re-login. */
function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
  const u = db.prepare('SELECT is_admin, role FROM users WHERE id = ?').get(req.user.id);
  if (!u || (u.is_admin !== 1 && u.role !== 'admin')) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

module.exports = { auth, optionalAuth, adminAuth };
