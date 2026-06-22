/**
 * Database Schema - Sistem Informasi DAMAI
 * Yayasan Dhyana Pura — Universitas, LPK, PT Penyalur Tenaga Kerja
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 *
 * HIERARKI ORGANISASI:
 *   Yayasan
 *    ├── org_units (Universitas Dhyana Pura, LPK Dhyana Pura, PT Dhyana Pura Talenta)
 *         └── faculties (Fakultas/Divisi di dalam setiap unit)
 *              └── employees (pegawai yang terikat ke satu faculty/divisi)
 */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/damai.db');
let db = null;

/**
 * Polyfill for better-sqlite3's db.transaction(fn) API.
 * node:sqlite's DatabaseSync does not ship this helper natively,
 * so we wrap BEGIN/COMMIT/ROLLBACK manually and return a callable
 * function matching the same calling convention: db.transaction(fn)()
 */
function addTransactionSupport(database) {
  database.transaction = function (fn) {
    return function (...args) {
      database.exec('BEGIN');
      try {
        const result = fn(...args);
        database.exec('COMMIT');
        return result;
      } catch (err) {
        database.exec('ROLLBACK');
        throw err;
      }
    };
  };
  return database;
}

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    addTransactionSupport(db);
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    -- ═══════════════════════════════════════════════════════
    -- ORGANIZATIONAL STRUCTURE
    -- ═══════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS org_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('universitas','lpk','ptptk')),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faculties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_unit_id INTEGER NOT NULL REFERENCES org_units(id) ON DELETE RESTRICT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
      nip_nidn TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      employee_type TEXT NOT NULL CHECK(employee_type IN ('dosen','tendik')),
      rank TEXT,
      email TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════
    -- USERS & AUTH (RBAC)
    -- ═══════════════════════════════════════════════════════
    -- role: yayasan | admin | pimpinan | manajer_unit | dosen_tendik | mahasiswa
    -- scope_org_unit_id: untuk role 'pimpinan' -> unit yang dipimpin (NULL utk yayasan/admin = semua)
    -- employee_id: untuk role 'manajer_unit'/'dosen_tendik' -> identitas pegawainya sendiri

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('yayasan','admin','pimpinan','manajer_unit','dosen_tendik','mahasiswa')),
      scope_org_unit_id INTEGER REFERENCES org_units(id),
      employee_id INTEGER REFERENCES employees(id),
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════
    -- DAMAI KPI FRAMEWORK
    -- ═══════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS kpi_dimensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      display_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dimension_id INTEGER NOT NULL REFERENCES kpi_dimensions(id),
      kpi_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      unit TEXT,
      target_value REAL NOT NULL,
      target_operator TEXT DEFAULT '>=',
      min_value REAL DEFAULT 0,
      max_value REAL,
      normalization_type TEXT NOT NULL CHECK(normalization_type IN ('percentage','likert_5','response_time','count','direct')),
      frequency TEXT DEFAULT 'semester',
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      academic_year TEXT,
      semester TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpi_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
      kpi_indicator_id INTEGER NOT NULL REFERENCES kpi_indicators(id),
      actual_value REAL,
      normalized_score REAL,
      notes TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','final')),
      entered_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, period_id, kpi_indicator_id)
    );

    CREATE TABLE IF NOT EXISTS kpi_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kpi_entry_id INTEGER NOT NULL REFERENCES kpi_entries(id) ON DELETE CASCADE,
      changed_by INTEGER NOT NULL REFERENCES users(id),
      old_value REAL,
      new_value REAL,
      old_status TEXT,
      new_status TEXT,
      action TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS damai_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
      score_disiplin REAL,
      score_amanah REAL,
      score_melayani REAL,
      score_adaptif REAL,
      score_inovatif REAL,
      total_score REAL,
      category TEXT,
      color_code TEXT,
      computed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, period_id)
    );

    -- ═══════════════════════════════════════════════════════
    -- PERFORMANCE REVIEWS
    -- ═══════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS performance_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      strengths TEXT,
      improvements TEXT,
      action_plan TEXT,
      reviewer_notes TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed','finalized')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, period_id)
    );

    -- ═══════════════════════════════════════════════════════
    -- NOTIFICATIONS
    -- ═══════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info' CHECK(type IN ('info','warning','alert','success')),
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ═══════════════════════════════════════════════════════
    -- INDEXES
    -- ═══════════════════════════════════════════════════════
    CREATE INDEX IF NOT EXISTS idx_employees_faculty ON employees(faculty_id);
    CREATE INDEX IF NOT EXISTS idx_faculties_org_unit ON faculties(org_unit_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_entries_emp_period ON kpi_entries(employee_id, period_id);
    CREATE INDEX IF NOT EXISTS idx_damai_scores_period ON damai_scores(period_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  console.log('✅ Database schema initialized');
  return db;
}

module.exports = { getDb, initializeDatabase, DB_PATH };
