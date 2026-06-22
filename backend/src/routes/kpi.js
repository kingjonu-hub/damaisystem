/**
 * KPI Routes — Dimensions, Entries, DAMAI Scores
 * Dengan penegakan hierarki visibilitas pada seluruh endpoint agregat
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeKpi, getCategory } = require('../utils/damai-engine');
const { getVisibleEmployeeIds, employeeScopeClause, canAccessEmployee, getScopeLabel } = require('../utils/visibility-scope');

const router = express.Router();

// ── KPI DIMENSIONS & INDICATORS ──────────────────────────────

router.get('/dimensions', authenticate, (req, res) => {
  const db = getDb();
  const dimensions = db.prepare(`
    SELECT kd.*,
      json_group_array(json_object(
        'id', ki.id, 'kpi_number', ki.kpi_number, 'name', ki.name,
        'unit', ki.unit, 'target_value', ki.target_value, 'target_operator', ki.target_operator,
        'min_value', ki.min_value, 'max_value', ki.max_value,
        'normalization_type', ki.normalization_type, 'frequency', ki.frequency
      )) as indicators
    FROM kpi_dimensions kd
    LEFT JOIN kpi_indicators ki ON kd.id = ki.dimension_id AND ki.is_active = 1
    GROUP BY kd.id
    ORDER BY kd.display_order
  `).all();

  const parsed = dimensions.map(d => ({
    ...d,
    indicators: JSON.parse(d.indicators).filter(i => i.id !== null),
  }));
  res.json({ data: parsed });
});

// PUT /api/kpi/dimensions/weights — admin mengubah bobot beberapa dimensi sekaligus.
// Body: { weights: [{ id: 1, weight: 0.20 }, { id: 2, weight: 0.25 }, ...] }
// Total seluruh bobot (termasuk dimensi yang TIDAK disertakan dalam body) harus = 1.0 (100%).
router.put('/dimensions/weights', authenticate, authorize('admin'), [
  body('weights').isArray({ min: 1 }).withMessage('weights harus berupa array'),
  body('weights.*.id').isInt().withMessage('id dimensi wajib diisi'),
  body('weights.*.weight').isFloat({ min: 0, max: 1 }).withMessage('weight harus berupa angka 0–1'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const allDims = db.prepare('SELECT id, code, name, weight FROM kpi_dimensions').all();
  const allIds = allDims.map(d => d.id);

  // Validasi semua id yang dikirim benar-benar ada
  const invalidIds = req.body.weights.filter(w => !allIds.includes(w.id));
  if (invalidIds.length > 0) {
    return res.status(400).json({ error: `Dimensi dengan id ${invalidIds.map(w => w.id).join(', ')} tidak ditemukan` });
  }

  // Hitung total bobot baru: ganti bobot dimensi yang dikirim, sisanya pakai bobot lama
  const newWeightMap = {};
  allDims.forEach(d => { newWeightMap[d.id] = d.weight; });
  req.body.weights.forEach(w => { newWeightMap[w.id] = w.weight; });

  const totalWeight = Object.values(newWeightMap).reduce((sum, w) => sum + w, 0);
  const rounded = Math.round(totalWeight * 10000) / 10000; // toleransi pembulatan floating point
  if (rounded !== 1) {
    return res.status(400).json({
      error: `Total bobot seluruh dimensi harus tepat 100%. Saat ini totalnya ${(rounded * 100).toFixed(2)}%.`,
      detail: allDims.map(d => ({ code: d.code, name: d.name, weight_percent: Math.round(newWeightMap[d.id] * 10000) / 100 })),
    });
  }

  const updateStmt = db.prepare('UPDATE kpi_dimensions SET weight = ? WHERE id = ?');
  db.transaction(() => {
    req.body.weights.forEach(w => updateStmt.run(w.weight, w.id));
  })();

  // Hitung ulang SEMUA skor DAMAI yang sudah ada di seluruh periode,
  // karena perubahan bobot dimensi memengaruhi total_score historis juga.
  const allScoredPairs = db.prepare('SELECT DISTINCT employee_id, period_id FROM damai_scores').all();
  allScoredPairs.forEach(pair => recomputeScore(db, pair.employee_id, pair.period_id));

  const updatedDims = db.prepare('SELECT id, code, name, weight FROM kpi_dimensions ORDER BY display_order').all();
  res.json({
    message: `Bobot dimensi berhasil diperbarui. ${allScoredPairs.length} skor DAMAI dihitung ulang otomatis.`,
    data: updatedDims,
  });
});

// PUT /api/kpi/indicators/:id — admin mengubah target/parameter satu indikator KPI
router.put('/indicators/:id', authenticate, authorize('admin'), [
  body('target_value').optional().isFloat(),
  body('target_operator').optional().isIn(['>=', '<=', '=']),
  body('normalization_type').optional().isIn(['percentage', 'likert_5', 'response_time', 'count', 'direct']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDb();
  const existing = db.prepare('SELECT * FROM kpi_indicators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Indikator KPI tidak ditemukan' });

  const { name, unit, target_value, target_operator, min_value, max_value, normalization_type, is_active } = req.body;
  db.prepare(`
    UPDATE kpi_indicators SET name=?, unit=?, target_value=?, target_operator=?,
      min_value=?, max_value=?, normalization_type=?, is_active=?
    WHERE id=?
  `).run(
    name ?? existing.name, unit ?? existing.unit,
    target_value ?? existing.target_value, target_operator ?? existing.target_operator,
    min_value ?? existing.min_value, max_value ?? existing.max_value,
    normalization_type ?? existing.normalization_type, is_active ?? existing.is_active,
    req.params.id
  );

  res.json({ message: 'Indikator KPI berhasil diperbarui. Skor yang sudah dihitung sebelumnya TIDAK otomatis berubah — gunakan "Hitung Ulang" pada halaman Skor DAMAI untuk menerapkan perubahan ini.' });
});

// ── KPI ENTRIES (input data) ──────────────────────────────────

router.get('/entries', authenticate, (req, res) => {
  const { employee_id, period_id } = req.query;
  if (!employee_id || !period_id) {
    return res.status(400).json({ error: 'employee_id dan period_id wajib disertakan' });
  }
  if (!canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
  }

  const db = getDb();
  const entries = db.prepare(`
    SELECT ke.*,
      ki.name as kpi_name, ki.unit, ki.target_value, ki.target_operator,
      ki.normalization_type, ki.kpi_number, ki.min_value, ki.max_value,
      kd.name as dimension_name, kd.code as dimension_code, kd.weight as dimension_weight
    FROM kpi_entries ke
    JOIN kpi_indicators ki ON ke.kpi_indicator_id = ki.id
    JOIN kpi_dimensions kd ON ki.dimension_id = kd.id
    WHERE ke.employee_id = ? AND ke.period_id = ?
    ORDER BY kd.display_order, ki.kpi_number
  `).all(employee_id, period_id);

  res.json({ data: entries });
});

router.post('/entries/bulk', authenticate, [
  body('employee_id').notEmpty(), body('period_id').notEmpty(),
  body('entries').isArray({ min: 1 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { employee_id, period_id, entries, status } = req.body;

  if (!canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses untuk mengisi KPI pegawai ini' });
  }
  // dosen_tendik hanya boleh isi KPI miliknya sendiri (bukan orang lain dalam scope—scope-nya memang hanya dirinya)
  if (req.user.role === 'dosen_tendik' && Number(req.user.employee_id) !== Number(employee_id)) {
    return res.status(403).json({ error: 'Anda hanya dapat mengisi KPI milik Anda sendiri' });
  }

  const db = getDb();
  const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(period_id);
  if (!period || period.status === 'completed') {
    return res.status(400).json({ error: 'Periode tidak aktif atau sudah selesai' });
  }

  const upsertEntry = db.prepare(`
    INSERT INTO kpi_entries (employee_id, period_id, kpi_indicator_id, actual_value, normalized_score, notes, status, entered_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, period_id, kpi_indicator_id)
    DO UPDATE SET actual_value=excluded.actual_value, normalized_score=excluded.normalized_score,
      notes=excluded.notes, status=excluded.status, entered_by=excluded.entered_by, updated_at=datetime('now')
  `);
  const logAudit = db.prepare(`
    INSERT INTO kpi_audit_log (kpi_entry_id, changed_by, old_value, new_value, old_status, new_status, action, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const indicators = db.prepare('SELECT * FROM kpi_indicators WHERE is_active = 1').all();
    const indMap = {};
    indicators.forEach(i => { indMap[i.id] = i; });

    let savedCount = 0;
    db.transaction(() => {
      for (const entry of entries) {
        const ind = indMap[entry.kpi_indicator_id];
        if (!ind) continue;

        const normalized = (entry.actual_value !== null && entry.actual_value !== undefined)
          ? normalizeKpi(entry.actual_value, ind) : null;

        const existing = db.prepare(
          'SELECT * FROM kpi_entries WHERE employee_id=? AND period_id=? AND kpi_indicator_id=?'
        ).get(employee_id, period_id, entry.kpi_indicator_id);

        const result = upsertEntry.run(
          employee_id, period_id, entry.kpi_indicator_id,
          entry.actual_value ?? null, normalized, entry.notes || null,
          status || 'draft', req.user.id
        );
        const entryId = existing?.id || result.lastInsertRowid;
        logAudit.run(
          entryId, req.user.id, existing?.actual_value ?? null, entry.actual_value ?? null,
          existing?.status || null, status || 'draft',
          existing ? 'update' : 'create', entry.notes || null
        );
        savedCount++;
      }
    })();

    if (['submitted', 'approved', 'final'].includes(status)) {
      recomputeScore(db, employee_id, period_id);
    }

    res.json({ message: `${savedCount} KPI berhasil disimpan`, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

router.put('/entries/:id/approve', authenticate, authorize('admin', 'manajer_unit', 'pimpinan', 'yayasan'), (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM kpi_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Data KPI tidak ditemukan' });

  if (!canAccessEmployee(req.user, entry.employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menyetujui KPI ini' });
  }

  db.prepare("UPDATE kpi_entries SET status='approved', approved_by=? WHERE id=?").run(req.user.id, req.params.id);
  recomputeScore(db, entry.employee_id, entry.period_id);
  res.json({ message: 'KPI berhasil disetujui' });
});

// ── DAMAI SCORES ───────────────────────────────────────────────

router.get('/scores', authenticate, (req, res) => {
  const { employee_id, period_id, faculty_id, org_unit_id } = req.query;
  const db = getDb();

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause: scopeClause, params: scopeParams } = employeeScopeClause(visibleIds, 'ds.employee_id');

  let query = `
    SELECT ds.*, e.name as employee_name, e.nip_nidn, e.position, e.rank, e.employee_type,
           f.id as faculty_id, f.name as faculty_name, f.code as faculty_code,
           ou.id as org_unit_id, ou.code as org_unit_code, ou.name as org_unit_name,
           p.name as period_name, p.academic_year, p.semester
    FROM damai_scores ds
    JOIN employees e ON ds.employee_id = e.id
    JOIN faculties f ON e.faculty_id = f.id
    JOIN org_units ou ON f.org_unit_id = ou.id
    JOIN periods p ON ds.period_id = p.id
    WHERE ${scopeClause}
  `;
  const params = [...scopeParams];

  if (employee_id) { query += ' AND ds.employee_id = ?'; params.push(employee_id); }
  if (period_id) { query += ' AND ds.period_id = ?'; params.push(period_id); }
  if (faculty_id) { query += ' AND e.faculty_id = ?'; params.push(faculty_id); }
  if (org_unit_id) { query += ' AND ou.id = ?'; params.push(org_unit_id); }

  query += ' ORDER BY ds.total_score DESC';
  const scores = db.prepare(query).all(...params);
  res.json({ data: scores, scope_label: getScopeLabel(req.user) });
});

router.post('/scores/compute', authenticate, authorize('admin', 'manajer_unit', 'pimpinan', 'yayasan'), (req, res) => {
  const { employee_id, period_id } = req.body;
  const db = getDb();

  if (employee_id && !canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghitung skor pegawai ini' });
  }

  try {
    if (employee_id && period_id) {
      recomputeScore(db, employee_id, period_id);
    } else if (period_id) {
      const visibleIds = getVisibleEmployeeIds(req.user);
      const { clause, params } = employeeScopeClause(visibleIds, 'employee_id');
      const employees = db.prepare(
        `SELECT DISTINCT employee_id FROM kpi_entries WHERE period_id = ? AND ${clause}`
      ).all(period_id, ...params);
      employees.forEach(e => recomputeScore(db, e.employee_id, period_id));
    }
    res.json({ message: 'Perhitungan skor DAMAI berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan komputasi' });
  }
});

router.get('/scores/summary', authenticate, (req, res) => {
  const { period_id } = req.query;
  const db = getDb();

  const activePeriod = period_id ||
    db.prepare("SELECT id FROM periods WHERE status='active' LIMIT 1").get()?.id ||
    db.prepare("SELECT id FROM periods WHERE status='completed' ORDER BY end_date DESC LIMIT 1").get()?.id;

  if (!activePeriod) return res.json({ data: null });

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause: scopeClause, params: scopeParams } = employeeScopeClause(visibleIds, 'ds.employee_id');

  const summary = db.prepare(`
    SELECT COUNT(*) as total_assessed,
      ROUND(AVG(ds.total_score),2) as avg_score, ROUND(MAX(ds.total_score),2) as max_score,
      ROUND(MIN(ds.total_score),2) as min_score,
      ROUND(AVG(ds.score_disiplin),2) as avg_disiplin, ROUND(AVG(ds.score_amanah),2) as avg_amanah,
      ROUND(AVG(ds.score_melayani),2) as avg_melayani, ROUND(AVG(ds.score_adaptif),2) as avg_adaptif,
      ROUND(AVG(ds.score_inovatif),2) as avg_inovatif,
      SUM(CASE WHEN ds.total_score>=90 THEN 1 ELSE 0 END) as count_sangat_baik,
      SUM(CASE WHEN ds.total_score>=80 AND ds.total_score<90 THEN 1 ELSE 0 END) as count_baik,
      SUM(CASE WHEN ds.total_score>=70 AND ds.total_score<80 THEN 1 ELSE 0 END) as count_cukup,
      SUM(CASE WHEN ds.total_score>=60 AND ds.total_score<70 THEN 1 ELSE 0 END) as count_kurang,
      SUM(CASE WHEN ds.total_score<60 THEN 1 ELSE 0 END) as count_perlu_perhatian
    FROM damai_scores ds
    WHERE ds.period_id = ? AND ${scopeClause}
  `).get(activePeriod, ...scopeParams);

  // Breakdown per org_unit (relevan untuk yayasan/admin)
  const byUnit = db.prepare(`
    SELECT ou.id as org_unit_id, ou.code, ou.name as unit_name,
      COUNT(*) as total, ROUND(AVG(ds.total_score),2) as avg_score
    FROM damai_scores ds
    JOIN employees e ON ds.employee_id = e.id
    JOIN faculties f ON e.faculty_id = f.id
    JOIN org_units ou ON f.org_unit_id = ou.id
    WHERE ds.period_id = ? AND ${scopeClause}
    GROUP BY ou.id ORDER BY avg_score DESC
  `).all(activePeriod, ...scopeParams);

  // Breakdown per faculty (relevan untuk pimpinan unit)
  const byFaculty = db.prepare(`
    SELECT f.id as faculty_id, f.code, f.name as faculty_name,
      COUNT(*) as total, ROUND(AVG(ds.total_score),2) as avg_score
    FROM damai_scores ds
    JOIN employees e ON ds.employee_id = e.id
    JOIN faculties f ON e.faculty_id = f.id
    WHERE ds.period_id = ? AND ${scopeClause}
    GROUP BY f.id ORDER BY avg_score DESC
  `).all(activePeriod, ...scopeParams);

  res.json({ data: { summary, byUnit, byFaculty, period_id: parseInt(activePeriod) }, scope_label: getScopeLabel(req.user) });
});

router.get('/scores/trend', authenticate, (req, res) => {
  const { employee_id } = req.query;
  const db = getDb();

  if (employee_id) {
    if (!canAccessEmployee(req.user, employee_id)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
    }
    const data = db.prepare(`
      SELECT p.name as period_name, p.start_date, ds.total_score,
             ds.score_disiplin, ds.score_amanah, ds.score_melayani, ds.score_adaptif, ds.score_inovatif
      FROM damai_scores ds JOIN periods p ON ds.period_id = p.id
      WHERE ds.employee_id = ? ORDER BY p.start_date
    `).all(employee_id);
    return res.json({ data });
  }

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause, params } = employeeScopeClause(visibleIds, 'ds.employee_id');
  const data = db.prepare(`
    SELECT p.name as period_name, p.start_date,
           ROUND(AVG(ds.total_score),2) as total_score,
           ROUND(AVG(ds.score_disiplin),2) as score_disiplin, ROUND(AVG(ds.score_amanah),2) as score_amanah,
           ROUND(AVG(ds.score_melayani),2) as score_melayani, ROUND(AVG(ds.score_adaptif),2) as score_adaptif,
           ROUND(AVG(ds.score_inovatif),2) as score_inovatif
    FROM damai_scores ds JOIN periods p ON ds.period_id = p.id
    WHERE ${clause}
    GROUP BY ds.period_id ORDER BY p.start_date
  `).all(...params);
  res.json({ data });
});

router.get('/scores/percentile', authenticate, (req, res) => {
  const { employee_id, period_id } = req.query;
  if (!employee_id || !period_id) return res.status(400).json({ error: 'employee_id dan period_id wajib disertakan' });
  if (!canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
  }

  const db = getDb();
  const myScore = db.prepare('SELECT total_score FROM damai_scores WHERE employee_id=? AND period_id=?').get(employee_id, period_id);
  if (!myScore) return res.json({ data: null });

  // Percentile dihitung relatif terhadap SCOPE user yang mengakses (mis. dosen dibanding scope dirinya tidak relevan;
  // gunakan scope organisasi tempat pegawai itu berada — yaitu unit/fakultas miliknya)
  const empFaculty = db.prepare('SELECT faculty_id FROM employees WHERE id = ?').get(employee_id);
  const allScores = db.prepare(`
    SELECT ds.total_score FROM damai_scores ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE e.faculty_id = ? AND ds.period_id = ? AND ds.total_score IS NOT NULL
  `).all(empFaculty.faculty_id, period_id).map(r => r.total_score);

  const below = allScores.filter(s => s < myScore.total_score).length;
  const percentile = Math.round((below / allScores.length) * 100);
  const rank = allScores.filter(s => s > myScore.total_score).length + 1;

  res.json({ data: { percentile, rank, total: allScores.length, score: myScore.total_score } });
});

router.get('/audit', authenticate, authorize('admin', 'manajer_unit', 'pimpinan', 'yayasan'), (req, res) => {
  const { employee_id, period_id } = req.query;
  const db = getDb();

  if (employee_id && !canAccessEmployee(req.user, employee_id)) {
    return res.status(403).json({ error: 'Anda tidak memiliki akses ke data pegawai ini' });
  }

  const visibleIds = getVisibleEmployeeIds(req.user);
  const { clause: scopeClause, params: scopeParams } = employeeScopeClause(visibleIds, 'ke.employee_id');

  let query = `
    SELECT kal.*, ke.kpi_indicator_id, ki.name as kpi_name, kd.code as dim_code,
           u.username as changed_by_username, e.name as employee_name
    FROM kpi_audit_log kal
    JOIN kpi_entries ke ON kal.kpi_entry_id = ke.id
    JOIN kpi_indicators ki ON ke.kpi_indicator_id = ki.id
    JOIN kpi_dimensions kd ON ki.dimension_id = kd.id
    JOIN users u ON kal.changed_by = u.id
    JOIN employees e ON ke.employee_id = e.id
    WHERE ${scopeClause}
  `;
  const params = [...scopeParams];
  if (employee_id) { query += ' AND ke.employee_id = ?'; params.push(employee_id); }
  if (period_id) { query += ' AND ke.period_id = ?'; params.push(period_id); }
  query += ' ORDER BY kal.created_at DESC LIMIT 200';

  res.json({ data: db.prepare(query).all(...params) });
});

// ── HELPER: recompute score for one employee/period ────────────
function recomputeScore(db, employee_id, period_id) {
  const entries = db.prepare(`
    SELECT ke.*, ki.normalization_type, ki.target_value, ki.min_value, ki.max_value, kd.code as dim_code
    FROM kpi_entries ke
    JOIN kpi_indicators ki ON ke.kpi_indicator_id = ki.id
    JOIN kpi_dimensions kd ON ki.dimension_id = kd.id
    WHERE ke.employee_id = ? AND ke.period_id = ?
  `).all(employee_id, period_id);
  if (entries.length === 0) return;

  // Bobot dimensi dibaca LANGSUNG dari database (kpi_dimensions.weight),
  // bukan hardcoded — sehingga jika admin mengubah persentase via
  // PUT /api/kpi/dimensions/:id, seluruh perhitungan ulang otomatis
  // memakai bobot terbaru tanpa perlu deploy ulang kode.
  const dimWeights = {};
  db.prepare('SELECT code, weight FROM kpi_dimensions').all().forEach(d => {
    dimWeights[d.code] = d.weight;
  });

  const dims = { D: [], A: [], M: [], AD: [], I: [] };
  entries.forEach(e => {
    if (e.actual_value !== null && e.actual_value !== undefined) {
      const score = normalizeKpi(e.actual_value, e);
      if (score !== null) dims[e.dim_code]?.push(score);
    }
  });

  const avg = arr => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;
  const sD = avg(dims.D), sA = avg(dims.A), sM = avg(dims.M), sAD = avg(dims.AD), sI = avg(dims.I);

  let total = null;
  const dimScores = { D: sD, A: sA, M: sM, AD: sAD, I: sI };
  const codes = Object.keys(dimWeights);
  const hasAll = codes.every(c => dimScores[c] !== null && dimScores[c] !== undefined);

  if (hasAll) {
    total = Math.round(codes.reduce((sum, c) => sum + dimScores[c] * dimWeights[c], 0) * 100) / 100;
  } else {
    // Partial scoring: re-weight proporsional terhadap dimensi yang tersedia datanya
    let weightedSum = 0, totalWeight = 0;
    codes.forEach(c => {
      if (dimScores[c] !== null && dimScores[c] !== undefined) {
        weightedSum += dimScores[c] * dimWeights[c];
        totalWeight += dimWeights[c];
      }
    });
    if (totalWeight > 0) total = Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  const cat = getCategory(total);

  db.prepare(`
    INSERT OR REPLACE INTO damai_scores
      (employee_id, period_id, score_disiplin, score_amanah, score_melayani, score_adaptif, score_inovatif,
       total_score, category, color_code, computed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(employee_id, period_id, sD, sA, sM, sAD, sI, total, cat?.name || null, cat?.color || null);
}

module.exports = router;
