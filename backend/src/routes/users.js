/**
 * Users Management Routes — Admin sebagai SUPER USER
 *
 * Hanya role 'admin' yang dapat melakukan CRUD penuh atas seluruh akun:
 *  - Membuat akun baru untuk SEMUA role (yayasan, pimpinan, manajer_unit, dosen_tendik, mahasiswa)
 *  - Mengubah role, status aktif, dan keterkaitan (unit/pegawai) akun manapun
 *  - Mereset password akun manapun
 *  - Menghapus (menonaktifkan) akun manapun, kecuali akun admin lain (safety guard)
 *
 * Role 'yayasan' hanya boleh MELIHAT daftar user (read-only), tidak mengelola.
 *
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'yayasan'), (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.is_active, u.last_login, u.created_at,
           u.scope_org_unit_id, u.employee_id,
           e.name as employee_name, e.nip_nidn, ou.name as scope_unit_name
    FROM users u
    LEFT JOIN employees e ON u.employee_id = e.id
    LEFT JOIN org_units ou ON u.scope_org_unit_id = ou.id
    ORDER BY u.role, u.username
  `).all();
  res.json({ data: users });
});

router.get('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.is_active, u.scope_org_unit_id, u.employee_id
    FROM users u WHERE u.id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json({ data: user });
});

router.post('/', authenticate, authorize('admin'), [
  body('username').trim().notEmpty().withMessage('Username wajib diisi'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').isIn(['yayasan', 'admin', 'pimpinan', 'manajer_unit', 'dosen_tendik', 'mahasiswa']).withMessage('Role tidak valid'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password, email, role, scope_org_unit_id, employee_id } = req.body;

  // Validasi kontekstual sesuai jenis role
  if (role === 'pimpinan' && !scope_org_unit_id) {
    return res.status(400).json({ error: 'Role pimpinan wajib memilih unit yang dipimpin (scope_org_unit_id)' });
  }
  if (['manajer_unit', 'dosen_tendik'].includes(role) && !employee_id) {
    return res.status(400).json({ error: 'Role ini wajib dikaitkan dengan data pegawai (employee_id)' });
  }

  const db = getDb();

  if (employee_id) {
    const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(400).json({ error: 'employee_id tidak ditemukan' });
  }
  if (scope_org_unit_id) {
    const unit = db.prepare('SELECT id FROM org_units WHERE id = ?').get(scope_org_unit_id);
    if (!unit) return res.status(400).json({ error: 'scope_org_unit_id tidak ditemukan' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, email, role, scope_org_unit_id, employee_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, hash, email || null, role, scope_org_unit_id || null, employee_id || null);
    res.status(201).json({ message: 'User berhasil dibuat', id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Username sudah digunakan' });
  }
});

router.put('/:id', authenticate, authorize('admin'), [
  body('role').optional().isIn(['yayasan', 'admin', 'pimpinan', 'manajer_unit', 'dosen_tendik', 'mahasiswa']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User tidak ditemukan' });

  const { email, role, scope_org_unit_id, employee_id, is_active } = req.body;
  const finalRole = role ?? existing.role;

  if (finalRole === 'pimpinan' && !(scope_org_unit_id ?? existing.scope_org_unit_id)) {
    return res.status(400).json({ error: 'Role pimpinan wajib memilih unit yang dipimpin' });
  }
  if (['manajer_unit', 'dosen_tendik'].includes(finalRole) && !(employee_id ?? existing.employee_id)) {
    return res.status(400).json({ error: 'Role ini wajib dikaitkan dengan data pegawai' });
  }

  db.prepare(`
    UPDATE users SET email=?, role=?, scope_org_unit_id=?, employee_id=?, is_active=?
    WHERE id=?
  `).run(
    email ?? existing.email, finalRole,
    scope_org_unit_id ?? existing.scope_org_unit_id, employee_id ?? existing.employee_id,
    is_active ?? existing.is_active, req.params.id
  );
  res.json({ message: 'User berhasil diperbarui' });
});

router.put('/:id/reset-password', authenticate, authorize('admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User tidak ditemukan' });

  const hash = bcrypt.hashSync(req.body.newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
  res.json({ message: 'Password berhasil direset' });
});

// DELETE /api/users/:id — soft-delete (nonaktifkan), bukan hapus baris secara permanen,
// supaya riwayat audit_log/KPI yang merujuk ke user ini (entered_by, reviewer_id) tetap valid.
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User tidak ditemukan' });

  // Safety guard: admin tidak bisa menghapus dirinya sendiri atau admin lain
  // (mencegah situasi tidak ada admin tersisa untuk mengelola sistem).
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'Akun admin tidak dapat dihapus melalui sistem. Hubungi pengelola database langsung jika diperlukan.' });
  }

  db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(req.params.id);
  res.json({ message: 'User berhasil dinonaktifkan (soft delete)' });
});

module.exports = router;
