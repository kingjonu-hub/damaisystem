/**
 * Periods Routes
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const periods = db.prepare('SELECT * FROM periods ORDER BY start_date DESC').all();
  res.json({ data: periods });
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(req.params.id);
  if (!period) return res.status(404).json({ error: 'Periode tidak ditemukan' });
  res.json({ data: period });
});

router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty(), body('start_date').notEmpty(), body('end_date').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const { name, academic_year, semester, start_date, end_date, status } = req.body;

  if (status === 'active') {
    db.prepare("UPDATE periods SET status = 'completed' WHERE status = 'active'").run();
  }

  const result = db.prepare(`
    INSERT INTO periods (name, academic_year, semester, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, academic_year || null, semester || null, start_date, end_date, status || 'draft');

  res.status(201).json({ message: 'Periode berhasil dibuat', id: result.lastInsertRowid });
});

router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM periods WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Periode tidak ditemukan' });

  const { name, academic_year, semester, start_date, end_date, status } = req.body;

  if (status === 'active' && existing.status !== 'active') {
    db.prepare("UPDATE periods SET status = 'completed' WHERE status = 'active'").run();
  }

  db.prepare(`
    UPDATE periods SET name=?, academic_year=?, semester=?, start_date=?, end_date=?, status=?
    WHERE id=?
  `).run(
    name ?? existing.name, academic_year ?? existing.academic_year, semester ?? existing.semester,
    start_date ?? existing.start_date, end_date ?? existing.end_date, status ?? existing.status,
    req.params.id
  );
  res.json({ message: 'Periode berhasil diperbarui' });
});

module.exports = router;
