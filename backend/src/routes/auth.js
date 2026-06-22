/**
 * Auth Routes
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { getScopeLabel } = require('../utils/visibility-scope');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function buildUserProfile(db, user) {
  let employee = null;
  if (user.employee_id) {
    employee = db.prepare(`
      SELECT e.*, f.name as faculty_name, f.code as faculty_code,
             ou.code as org_unit_code, ou.name as org_unit_name
      FROM employees e
      JOIN faculties f ON e.faculty_id = f.id
      JOIN org_units ou ON f.org_unit_id = ou.id
      WHERE e.id = ?
    `).get(user.employee_id);
  }
  let scopeUnit = null;
  if (user.scope_org_unit_id) {
    scopeUnit = db.prepare('SELECT * FROM org_units WHERE id = ?').get(user.scope_org_unit_id);
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id,
    employee_name: employee?.name || null,
    nip_nidn: employee?.nip_nidn || null,
    position: employee?.position || null,
    rank: employee?.rank || null,
    faculty_name: employee?.faculty_name || null,
    faculty_code: employee?.faculty_code || null,
    org_unit_code: employee?.org_unit_code || scopeUnit?.code || null,
    org_unit_name: employee?.org_unit_name || scopeUnit?.name || null,
    scope_org_unit_id: user.scope_org_unit_id,
    scope_label: getScopeLabel(user),
    created_at: user.created_at,
  };
}

router.post('/login', [
  body('username').notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) return res.status(401).json({ error: 'Username atau password salah' });

  db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const profile = buildUserProfile(db, user);

  res.json({ token, user: profile });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  res.json({ user: buildUserProfile(db, req.user) });
});

router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const valid = bcrypt.compareSync(req.body.currentPassword, req.user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Password saat ini salah' });

  const newHash = bcrypt.hashSync(req.body.newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ message: 'Password berhasil diubah' });
});

module.exports = router;
