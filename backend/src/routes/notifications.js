/**
 * Notifications Routes
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { getDb } = require('../database/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { limit = 20, unread_only } = req.query;
  const db = getDb();
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [req.user.id];
  if (unread_only === '1') query += ' AND is_read = 0';
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const notifs = db.prepare(query).all(...params);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id);
  res.json({ data: notifs, unread_count: unread.c });
});

router.put('/:id/read', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Notifikasi ditandai dibaca' });
});

router.put('/read-all', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ message: 'Semua notifikasi ditandai dibaca' });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Notifikasi dihapus' });
});

module.exports = router;
