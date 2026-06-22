/**
 * Organization Routes — org_units & faculties
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/org/units — daftar unit yayasan (semua role bisa lihat daftar nama unit)
router.get('/units', authenticate, (req, res) => {
  const db = getDb();
  const units = db.prepare('SELECT * FROM org_units WHERE is_active = 1 ORDER BY id').all();
  res.json({ data: units });
});

router.post('/units', authenticate, authorize('yayasan', 'admin'), [
  body('code').notEmpty(), body('name').notEmpty(),
  body('type').isIn(['universitas', 'lpk', 'ptptk']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO org_units (code, name, type, description) VALUES (?, ?, ?, ?)')
      .run(req.body.code, req.body.name, req.body.type, req.body.description || null);
    res.status(201).json({ message: 'Unit berhasil ditambahkan', id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Kode unit sudah digunakan' });
  }
});

// GET /api/org/faculties — daftar fakultas/divisi, bisa difilter by org_unit_id
router.get('/faculties', authenticate, (req, res) => {
  const { org_unit_id } = req.query;
  const db = getDb();
  let query = `
    SELECT f.*, ou.code as org_unit_code, ou.name as org_unit_name, ou.type as org_unit_type
    FROM faculties f
    JOIN org_units ou ON f.org_unit_id = ou.id
    WHERE f.is_active = 1
  `;
  const params = [];
  if (org_unit_id) { query += ' AND f.org_unit_id = ?'; params.push(org_unit_id); }
  query += ' ORDER BY ou.id, f.id';
  const faculties = db.prepare(query).all(...params);
  res.json({ data: faculties });
});

router.post('/faculties', authenticate, authorize('yayasan', 'admin'), [
  body('code').notEmpty(), body('name').notEmpty(), body('org_unit_id').isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO faculties (org_unit_id, code, name, description) VALUES (?, ?, ?, ?)')
      .run(req.body.org_unit_id, req.body.code, req.body.name, req.body.description || null);
    res.status(201).json({ message: 'Fakultas/divisi berhasil ditambahkan', id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Kode fakultas/divisi sudah digunakan' });
  }
});

module.exports = router;
