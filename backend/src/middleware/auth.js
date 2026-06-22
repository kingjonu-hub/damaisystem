/**
 * Auth & Authorization Middleware
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const jwt = require('jsonwebtoken');
const { getDb } = require('../database/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token akses tidak ditemukan' });
  }
  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Pengguna tidak ditemukan atau tidak aktif' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Belum terautentikasi' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses resource ini' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
