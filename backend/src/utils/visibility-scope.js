/**
 * Visibility Scope Helper
 * Sistem Informasi DAMAI — Yayasan Dhyana Pura
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 *
 * Aturan hierarki visibilitas data pegawai/skor/review:
 *
 *  yayasan      -> SEMUA unit (Universitas + LPK + PT Penyalur Tenaga Kerja)
 *  admin        -> SEMUA unit (akses administratif sistem)
 *  pimpinan     -> SELURUH fakultas/divisi DI DALAM satu org_unit (scope_org_unit_id)
 *                  contoh: Rektor hanya melihat Universitas, tidak melihat LPK/PT
 *  manajer_unit -> HANYA fakultas/divisi miliknya sendiri (via employee_id -> faculty_id)
 *                  contoh: Dekan FEB hanya melihat FEB, tidak FIKOM/FTI
 *  dosen_tendik -> HANYA dirinya sendiri (employee_id)
 *  mahasiswa    -> tidak punya akses ke data pegawai
 */

const { getDb } = require('../database/schema');

/**
 * Mengembalikan daftar employee_id yang BOLEH dilihat oleh user ini.
 * Return null artinya "tanpa batas / semua employee" (yayasan, admin).
 * Return [] artinya "tidak ada yang boleh dilihat".
 */
function getVisibleEmployeeIds(user) {
  const db = getDb();

  if (user.role === 'yayasan' || user.role === 'admin') {
    return null; // unrestricted
  }

  if (user.role === 'pimpinan') {
    if (!user.scope_org_unit_id) return [];
    const rows = db.prepare(`
      SELECT e.id FROM employees e
      JOIN faculties f ON e.faculty_id = f.id
      WHERE f.org_unit_id = ?
    `).all(user.scope_org_unit_id);
    return rows.map(r => r.id);
  }

  if (user.role === 'manajer_unit') {
    if (!user.employee_id) return [];
    const me = db.prepare('SELECT faculty_id FROM employees WHERE id = ?').get(user.employee_id);
    if (!me) return [];
    const rows = db.prepare('SELECT id FROM employees WHERE faculty_id = ?').all(me.faculty_id);
    return rows.map(r => r.id);
  }

  if (user.role === 'dosen_tendik') {
    return user.employee_id ? [user.employee_id] : [];
  }

  return []; // mahasiswa or unknown role
}

/**
 * Builds a SQL WHERE fragment + params for filtering by employee_id
 * given a visibility id list (or null for unrestricted).
 * Usage: const { clause, params } = employeeScopeClause(visibleIds, 'e.id');
 */
function employeeScopeClause(visibleIds, columnName = 'employee_id') {
  if (visibleIds === null) return { clause: '1=1', params: [] };
  if (visibleIds.length === 0) return { clause: '1=0', params: [] };
  const placeholders = visibleIds.map(() => '?').join(',');
  return { clause: `${columnName} IN (${placeholders})`, params: visibleIds };
}

/**
 * Checks whether a user is allowed to view/act on a specific employee_id.
 */
function canAccessEmployee(user, employeeId) {
  const visible = getVisibleEmployeeIds(user);
  if (visible === null) return true;
  return visible.includes(Number(employeeId));
}

/**
 * Human-readable description of the user's scope (for UI banners).
 */
function getScopeLabel(user) {
  const db = getDb();
  if (user.role === 'yayasan') return 'Seluruh unit Yayasan (Universitas, LPK, PT Penyalur Tenaga Kerja)';
  if (user.role === 'admin') return 'Seluruh unit (akses administratif)';
  if (user.role === 'pimpinan') {
    const unit = db.prepare('SELECT name FROM org_units WHERE id = ?').get(user.scope_org_unit_id);
    return unit ? `${unit.name} (seluruh fakultas/divisi)` : 'Unit tidak ditemukan';
  }
  if (user.role === 'manajer_unit') {
    const me = db.prepare(`
      SELECT f.name as fac_name FROM employees e
      JOIN faculties f ON e.faculty_id = f.id
      WHERE e.id = ?
    `).get(user.employee_id);
    return me ? `${me.fac_name} saja` : 'Fakultas/divisi sendiri';
  }
  if (user.role === 'dosen_tendik') return 'Data diri sendiri';
  return 'Tidak ada akses';
}

module.exports = {
  getVisibleEmployeeIds,
  employeeScopeClause,
  canAccessEmployee,
  getScopeLabel,
};
