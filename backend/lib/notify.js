const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

/* Persist a notification and push it live to the user's Socket.io room.
   Best-effort: never throws into the caller's request path. */
function notify(io, userId, { type = 'info', title, body = null, link = null } = {}) {
  if (!userId || !title) return null;
  try {
    const id = uuidv4();
    db.prepare('INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, userId, type, title, body, link);
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    try { io?.to(`user:${userId}`).emit('notification', row); } catch { /* socket optional */ }
    return row;
  } catch (e) {
    console.error('notify failed:', e.message);
    return null;
  }
}

/* Notify every admin (e.g. new documents awaiting review). */
function notifyAdmins(io, payload) {
  try {
    const admins = db.prepare('SELECT id FROM users WHERE is_admin = 1').all();
    for (const a of admins) notify(io, a.id, payload);
  } catch (e) {
    console.error('notifyAdmins failed:', e.message);
  }
}

module.exports = { notify, notifyAdmins };
