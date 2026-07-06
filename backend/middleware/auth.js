const jwt = require('jsonwebtoken');
const db = require('../db/database');
const JWT_SECRET = require('../config/secret');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  let payload;
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
  /* Re-check the account on every request so a ban or deletion takes effect
     immediately, rather than staying valid until the 30-day token expires. */
  const u = db.prepare('SELECT id, role, COALESCE(banned, 0) AS banned FROM users WHERE id = ?').get(payload.id);
  if (!u) return res.status(401).json({ error: 'Compte introuvable' });
  if (u.banned === 1) return res.status(403).json({ error: 'Ce compte a été bloqué par un administrateur.' });
  req.user = { id: u.id, role: u.role };
  next();
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      const u = db.prepare('SELECT id, role, COALESCE(banned, 0) AS banned FROM users WHERE id = ?').get(payload.id);
      if (u && u.banned !== 1) req.user = { id: u.id, role: u.role }; // ignore banned/deleted
    } catch { /* anonymous */ }
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
