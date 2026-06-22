/**
 * Employees Routes — dengan penegakan hierarki visibilitas
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { getVisibleEmployeeIds, employeeScopeClause, canAccessEmployee, getScopeLabel } = require('../utils/visibility-scope');

const router = express.Router();

// GET /api/employees — list pegawai TERBATAS sesuai scope role
router.get('/', authenticate, (req, res) => {
  const { search, employee_type, faculty_id, org_unit_id, is_active, page = 1, limit = 50 } = req.query;
  const db = getDb();

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause: scopeClause, params: scopeParams } = employeeScopeClause(visibleIds, 'e.id');

  let query = `
    SELECT e.*, f.name as faculty_name, f.code as faculty_code,
           ou.id as org_unit_id, ou.code as org_unit_code, ou.name as org_unit_name, ou.type as org_unit_type
    FROM employees e
    JOIN faculties f ON e.faculty_id = f.id
    JOIN org_units ou ON f.org_unit_id = ou.id
    WHERE ${scopeClause}
  `;
  const params = [...scopeParams];

  if (search) {
    query += ' AND (e.name LIKE ? OR e.nip_nidn LIKE ? OR e.email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (employee_type) { query += ' AND e.employee_type = ?'; params.push(employee_type); }
  if (faculty_id) { query += ' AND e.faculty_id = ?'; params.push(faculty_id); }
  if (org_unit_id) { query += ' AND ou.id = ?'; params.push(org_unit_id); }
  if (is_active !== undefined && is_active !== '') { query += ' AND e.is_active = ?'; params.push(is_active); }

  const countQuery = query.replace(
    /SELECT e\.\*.*FROM employees/s,
    'SELECT COUNT(*) as total FROM employees'
  );
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  query += ' ORDER BY ou.id, f.id, e.name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const employees = db.prepare(query).all(...params);

  res.json({
    data: employees,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
    scope_label: getScopeLabel(req.user),
  });
});

// GET /api/employees/:id
router.get('/:id', authenticate, (req, res) => {
  if (!canAccessEmployee(req.user, req.params.id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
  }
  const db = getDb();
  const employee = db.prepare(`
    SELECT e.*, f.name as faculty_name, f.code as faculty_code,
           ou.code as org_unit_code, ou.name as org_unit_name
    FROM employees e
    JOIN faculties f ON e.faculty_id = f.id
    JOIN org_units ou ON f.org_unit_id = ou.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Pegawai tidak ditemukan' });
  res.json({ data: employee });
});

// POST /api/employees — hanya admin (yayasan tidak mengelola data operasional pegawai langsung)
router.post('/', authenticate, authorize('admin'), [
  body('nip_nidn').notEmpty(), body('name').notEmpty(),
  body('faculty_id').isInt(), body('position').notEmpty(),
  body('employee_type').isIn(['dosen', 'tendik']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { nip_nidn, name, faculty_id, position, employee_type, rank, email, phone } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO employees (nip_nidn, name, faculty_id, position, employee_type, rank, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nip_nidn, name, faculty_id, position, employee_type, rank || null, email || null, phone || null);
    res.status(201).json({ message: 'Pegawai berhasil ditambahkan', id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'NIP/NIDN sudah digunakan' });
  }
});

// PUT /api/employees/:id — admin penuh, manajer_unit hanya bisa edit pegawai dalam scope-nya (non-kritis fields)
router.put('/:id', authenticate, authorize('admin', 'manajer_unit'), (req, res) => {
  if (!canAccessEmployee(req.user, req.params.id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pegawai tidak ditemukan' });

  const { name, position, rank, email, phone, is_active, faculty_id, employee_type } = req.body;

  // manajer_unit tidak boleh memindahkan pegawai ke faculty lain atau ubah is_active
  const isAdmin = req.user.role === 'admin';
  db.prepare(`
    UPDATE employees SET
      name = ?, position = ?, rank = ?, email = ?, phone = ?,
      faculty_id = ?, employee_type = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    position ?? existing.position,
    rank ?? existing.rank,
    email ?? existing.email,
    phone ?? existing.phone,
    isAdmin ? (faculty_id ?? existing.faculty_id) : existing.faculty_id,
    isAdmin ? (employee_type ?? existing.employee_type) : existing.employee_type,
    isAdmin ? (is_active ?? existing.is_active) : existing.is_active,
    req.params.id
  );
  res.json({ message: 'Data pegawai berhasil diperbarui' });
});

module.exports = router;
