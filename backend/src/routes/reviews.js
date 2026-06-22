/**
 * Performance Review Routes — dengan hierarki visibilitas ketat
 *
 *  yayasan      -> lihat SEMUA review (Universitas + LPK + PT)
 *  admin        -> lihat SEMUA review
 *  pimpinan     -> lihat review SELURUH fakultas/divisi di unit yang dipimpinnya
 *  manajer_unit -> lihat review HANYA fakultas/divisinya sendiri
 *  dosen_tendik -> lihat HANYA review milik dirinya sendiri
 *
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { getVisibleEmployeeIds, employeeScopeClause, canAccessEmployee, getScopeLabel } = require('../utils/visibility-scope');

const router = express.Router();

// GET /api/reviews — terbatas sesuai scope
router.get('/', authenticate, (req, res) => {
  const { employee_id, period_id, status } = req.query;
  const db = getDb();

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause: scopeClause, params: scopeParams } = employeeScopeClause(visibleIds, 'pr.employee_id');

  let query = `
    SELECT pr.*, e.name as employee_name, e.nip_nidn, e.employee_type,
           f.name as faculty_name, f.code as faculty_code,
           ou.code as org_unit_code, ou.name as org_unit_name,
           p.name as period_name, u.username as reviewer_username
    FROM performance_reviews pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN faculties f ON e.faculty_id = f.id
    JOIN org_units ou ON f.org_unit_id = ou.id
    JOIN periods p ON pr.period_id = p.id
    JOIN users u ON pr.reviewer_id = u.id
    WHERE ${scopeClause}
  `;
  const params = [...scopeParams];

  if (employee_id) { query += ' AND pr.employee_id = ?'; params.push(employee_id); }
  if (period_id) { query += ' AND pr.period_id = ?'; params.push(period_id); }
  if (status) { query += ' AND pr.status = ?'; params.push(status); }

  query += ' ORDER BY pr.updated_at DESC';
  const reviews = db.prepare(query).all(...params);

  res.json({ data: reviews, scope_label: getScopeLabel(req.user) });
});

// GET /api/reviews/:id — single review, dicek scope juga
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const review = db.prepare(`
    SELECT pr.*, e.name as employee_name, e.nip_nidn,
           f.name as faculty_name, p.name as period_name, u.username as reviewer_username
    FROM performance_reviews pr
    JOIN employees e ON pr.employee_id = e.id
    JOIN faculties f ON e.faculty_id = f.id
    JOIN periods p ON pr.period_id = p.id
    JOIN users u ON pr.reviewer_id = u.id
    WHERE pr.id = ?
  `).get(req.params.id);

  if (!review) return res.status(404).json({ error: 'Review tidak ditemukan' });
  if (!canAccessEmployee(req.user, review.employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke review ini' });
  }
  res.json({ data: review });
});

// POST /api/reviews — hanya pihak yang berwenang mereview (bukan dosen_tendik untuk diri sendiri / mahasiswa)
router.post('/', authenticate, authorize('admin', 'pimpinan', 'manajer_unit', 'yayasan'), [
  body('employee_id').notEmpty(), body('period_id').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { employee_id, period_id, strengths, improvements, action_plan, reviewer_notes, status } = req.body;

  if (!canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses untuk membuat review pegawai ini' });
  }

  const db = getDb();
  try {
    const existing = db.prepare('SELECT id FROM performance_reviews WHERE employee_id=? AND period_id=?').get(employee_id, period_id);
    if (existing) {
      db.prepare(`
        UPDATE performance_reviews SET strengths=?, improvements=?, action_plan=?, reviewer_notes=?,
          status=?, reviewer_id=?, updated_at=datetime('now')
        WHERE id=?
      `).run(strengths, improvements, action_plan, reviewer_notes, status || 'draft', req.user.id, existing.id);
      return res.json({ message: 'Review berhasil diperbarui', id: existing.id });
    }
    const result = db.prepare(`
      INSERT INTO performance_reviews (employee_id, period_id, reviewer_id, strengths, improvements, action_plan, reviewer_notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employee_id, period_id, req.user.id, strengths, improvements, action_plan, reviewer_notes, status || 'draft');
    res.status(201).json({ message: 'Review berhasil dibuat', id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/reviews/:id/status — update status saja (workflow Draft -> Submitted -> Reviewed -> Finalized)
router.put('/:id/status', authenticate, authorize('admin', 'pimpinan', 'manajer_unit', 'yayasan'), [
  body('status').isIn(['draft', 'submitted', 'reviewed', 'finalized']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const review = db.prepare('SELECT * FROM performance_reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review tidak ditemukan' });
  if (!canAccessEmployee(req.user, review.employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke review ini' });
  }

  db.prepare("UPDATE performance_reviews SET status=?, updated_at=datetime('now') WHERE id=?")
    .run(req.body.status, req.params.id);
  res.json({ message: 'Status review berhasil diperbarui' });
});

module.exports = router;
