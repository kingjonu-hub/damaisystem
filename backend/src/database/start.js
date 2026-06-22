/**
 * Production-Safe Startup Script
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 *
 * Skrip ini dijalankan sebagai start command di platform deploy (Railway/Render).
 * Berbeda dengan menjalankan `seed.js` secara langsung (yang SELALU menghapus
 * dan menulis ulang seluruh data), skrip ini HANYA melakukan seeding jika
 * database benar-benar kosong (belum ada satu pun user terdaftar).
 *
 * Ini mencegah data hilang setiap kali container restart/redeploy — karena
 * pada platform seperti Railway, start command bisa terpanggil ulang kapan
 * saja (crash recovery, redeploy, scaling), dan kita TIDAK ingin bobot KPI
 * atau akun yang sudah diubah admin kembali ke kondisi awal setiap saat itu.
 */

const { getDb, initializeDatabase } = require('./schema');

function isDatabaseEmpty(db) {
  try {
    const row = db.prepare('SELECT COUNT(*) as c FROM users').get();
    return row.c === 0;
  } catch (err) {
    // Tabel users belum ada sama sekali -> database benar-benar baru
    return true;
  }
}

function main() {
  initializeDatabase();
  const db = getDb();

  if (isDatabaseEmpty(db)) {
    console.log('📦 Database kosong — menjalankan seed awal...');
    require('./seed.js');
  } else {
    console.log('✅ Database sudah berisi data — seed dilewati (data existing dipertahankan).');
  }
}

main();
