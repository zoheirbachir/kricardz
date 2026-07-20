const express = require('express');
const db = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

/* My notifications (most recent first) + unread count. */
router.get('/', auth, (req, res) => {
  const items = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id).map(n => ({ ...n, read: Boolean(n.read) }));
  const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c;
  res.json({ items, unread });
});

/* Mark everything read. */
router.post('/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
  res.json({ ok: true, unread: 0 });
});

/* Mark one read (only your own). */
router.post('/:id/read', auth, (req, res) => {
  const n = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Notification introuvable' });
  if (n.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
  const unread = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c;
  res.json({ ok: true, unread });
});

module.exports = router;
