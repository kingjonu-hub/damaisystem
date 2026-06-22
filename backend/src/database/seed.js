/**
 * Seed Script — Sistem Informasi DAMAI
 * Yayasan Dhyana Pura: Universitas Dhyana Pura + LPK Dhyana Pura + PT Dhyana Pura Talenta
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('./schema');

function seed() {
  initializeDatabase();
  const db = getDb();

  console.log('🌱 Mulai seeding database...\n');

  db.exec(`
    DELETE FROM kpi_audit_log; DELETE FROM kpi_entries; DELETE FROM damai_scores;
    DELETE FROM performance_reviews; DELETE FROM notifications; DELETE FROM users;
    DELETE FROM employees; DELETE FROM faculties; DELETE FROM org_units;
    DELETE FROM kpi_indicators; DELETE FROM kpi_dimensions; DELETE FROM periods;
  `);

  // ── ORG UNITS ──────────────────────────────────────────────
  const insUnit = db.prepare('INSERT INTO org_units (code, name, type, description) VALUES (?, ?, ?, ?)');
  const unitUndhira = insUnit.run('UNDHIRA', 'Universitas Dhyana Pura', 'universitas', 'Perguruan tinggi di bawah Yayasan Dhyana Pura').lastInsertRowid;
  const unitLpk = insUnit.run('LPK', 'LPK Dhyana Pura', 'lpk', 'Lembaga Pelatihan Kerja di bawah Yayasan Dhyana Pura').lastInsertRowid;
  const unitPt = insUnit.run('PTPTK', 'PT Dhyana Pura Talenta', 'ptptk', 'Perusahaan penyalur tenaga kerja di bawah Yayasan Dhyana Pura').lastInsertRowid;
  console.log('✅ 3 unit organisasi dibuat (Universitas, LPK, PT Talenta)');

  // ── FACULTIES / DIVISIONS ──────────────────────────────────
  const insFac = db.prepare('INSERT INTO faculties (org_unit_id, code, name, description) VALUES (?, ?, ?, ?)');
  const facFeb = insFac.run(unitUndhira, 'FEB', 'Fakultas Ekonomi & Bisnis', null).lastInsertRowid;
  const facFikom = insFac.run(unitUndhira, 'FIKOM', 'Fakultas Ilmu Komunikasi', null).lastInsertRowid;
  const facFti = insFac.run(unitUndhira, 'FTI', 'Fakultas Teknik & Informatika', null).lastInsertRowid;
  const facLpkOps = insFac.run(unitLpk, 'LPK-OPS', 'Divisi Operasional Pelatihan', null).lastInsertRowid;
  const facLpkAdm = insFac.run(unitLpk, 'LPK-ADM', 'Divisi Administrasi & Sertifikasi', null).lastInsertRowid;
  const facPtRec = insFac.run(unitPt, 'PT-REC', 'Divisi Rekrutmen & Penempatan', null).lastInsertRowid;
  const facPtAdm = insFac.run(unitPt, 'PT-ADM', 'Divisi Administrasi & Legal', null).lastInsertRowid;
  console.log('✅ 7 fakultas/divisi dibuat di seluruh unit');

  // ── KPI DIMENSIONS ─────────────────────────────────────────
  const insDim = db.prepare('INSERT INTO kpi_dimensions (code, name, weight, display_order) VALUES (?, ?, ?, ?)');
  const dimD = insDim.run('D', 'Disiplin', 0.20, 1).lastInsertRowid;
  const dimA = insDim.run('A', 'Amanah', 0.25, 2).lastInsertRowid;
  const dimM = insDim.run('M', 'Melayani', 0.25, 3).lastInsertRowid;
  const dimAD = insDim.run('AD', 'Adaptif', 0.15, 4).lastInsertRowid;
  const dimI = insDim.run('I', 'Inovatif', 0.15, 5).lastInsertRowid;
  console.log('✅ 5 dimensi DAMAI dibuat (D=20%, A=25%, M=25%, AD=15%, I=15%)');

  // ── KPI INDICATORS ─────────────────────────────────────────
  const insInd = db.prepare(`
    INSERT INTO kpi_indicators (dimension_id, kpi_number, name, unit, target_value, target_operator, min_value, max_value, normalization_type, frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const indicators = [
    [dimD, 1, 'Kehadiran', '%', 95, '>=', 0, 100, 'percentage'],
    [dimD, 2, 'Ketepatan Waktu Laporan', '%', 100, '>=', 0, 100, 'percentage'],
    [dimD, 3, 'SOP Compliance Rate', '%', 90, '>=', 0, 100, 'percentage'],
    [dimD, 4, 'Penggunaan Cuti Tertib', '%', 100, '>=', 0, 100, 'percentage'],
    [dimA, 5, 'Integritas Score', 'Skor 0-100', 85, '>=', 0, 100, 'direct'],
    [dimA, 6, 'Transparansi Anggaran', '%', 90, '>=', 0, 100, 'percentage'],
    [dimA, 7, 'Akuntabilitas Output Kerja', '%', 90, '>=', 0, 100, 'percentage'],
    [dimA, 8, 'Indeks Etika Kerja', 'Skor 0-100', 85, '>=', 0, 100, 'direct'],
    [dimM, 9, 'Indeks Kepuasan Mahasiswa/Klien', 'Skala 1-5', 4.2, '>=', 1, 5, 'likert_5'],
    [dimM, 10, 'Response Time Layanan', 'Hari', 2, '<=', 0, 30, 'response_time'],
    [dimM, 11, 'Service Quality Score', 'Skor 0-100', 85, '>=', 0, 100, 'direct'],
    [dimM, 12, 'Stakeholder Satisfaction', '%', 80, '>=', 0, 100, 'percentage'],
    [dimAD, 13, 'Learning Agility Index', 'Skor 0-100', 80, '>=', 0, 100, 'direct'],
    [dimAD, 14, 'Change Readiness Score', 'Skor 0-100', 75, '>=', 0, 100, 'direct'],
    [dimAD, 15, 'Resilience Index', 'Skor 0-100', 80, '>=', 0, 100, 'direct'],
    [dimAD, 16, 'Flexibility Score', 'Skor 0-100', 80, '>=', 0, 100, 'direct'],
    [dimI, 17, 'Jumlah Inovasi per Tahun', 'Unit', 2, '>=', 0, 10, 'count'],
    [dimI, 18, 'Research & Publication Output', 'Judul', 1, '>=', 0, 10, 'count'],
    [dimI, 19, 'Digital Adoption Rate', '%', 75, '>=', 0, 100, 'percentage'],
    [dimI, 20, 'Improvement Ideas Implemented', '%', 60, '>=', 0, 100, 'percentage'],
  ];
  indicators.forEach(row => insInd.run(...row));
  console.log('✅ 20 indikator KPI dibuat (4 per dimensi)');

  // ── PERIODS ────────────────────────────────────────────────
  const insPeriod = db.prepare('INSERT INTO periods (name, academic_year, semester, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)');
  insPeriod.run('Semester Ganjil 2024/2025', '2024/2025', 'ganjil', '2024-08-01', '2025-01-31', 'completed');
  const periodGenap2425 = insPeriod.run('Semester Genap 2024/2025', '2024/2025', 'genap', '2025-02-01', '2025-07-31', 'completed').lastInsertRowid;
  const periodGanjil2526 = insPeriod.run('Semester Genap 2025/2026', '2025/2026', 'genap', '2026-02-01', '2026-07-31', 'active').lastInsertRowid;
  console.log('✅ 3 periode penilaian dibuat');

  // ── EMPLOYEES ──────────────────────────────────────────────
  const insEmp = db.prepare(`
    INSERT INTO employees (faculty_id, nip_nidn, name, position, employee_type, rank, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const employees = [
    [facFeb, '0011078301', 'Dr. Made Artawan Eka Putra, SE., M.M.', 'Dosen Tetap', 'dosen', 'Lektor Kepala', 'made.artawan@undhira.ac.id', '081234560001'],
    [facFeb, '0025068902', 'Ni Ketut Rasmini, SE., M.Si.', 'Dosen Tetap', 'dosen', 'Lektor', 'ketut.rasmini@undhira.ac.id', '081234560002'],
    [facFeb, '0018059203', 'I Putu Gede Setiawan, SE., M.Ak.', 'Dosen Tetap', 'dosen', 'Asisten Ahli', 'putu.setiawan@undhira.ac.id', '081234560003'],
    [facFeb, '0007049104', 'Ni Luh Putu Srinadi, SE., M.M.', 'Dosen Tetap', 'dosen', 'Lektor', 'luh.srinadi@undhira.ac.id', '081234560004'],
    [facFeb, 'NIP0001FEB', 'I Wayan Arta Suanda, S.Sos.', 'Staf Administrasi', 'tendik', null, 'wayan.suanda@undhira.ac.id', '081234560005'],
    [facFikom, '0014078505', 'Dr. Ida Ayu Putu Widiawati, S.Sos., M.Si.', 'Dosen Tetap', 'dosen', 'Lektor Kepala', 'ayu.widiawati@undhira.ac.id', '081234560006'],
    [facFikom, '0021089106', 'I Made Dwi Mertha Adnyana, S.I.Kom., M.I.Kom.', 'Dosen Tetap', 'dosen', 'Lektor', 'made.adnyana@undhira.ac.id', '081234560007'],
    [facFikom, '0003079207', 'Ni Komang Trisna Warapsari, S.I.Kom., M.I.Kom.', 'Dosen Tetap', 'dosen', 'Asisten Ahli', 'komang.trisna@undhira.ac.id', '081234560008'],
    [facFikom, '0029068808', 'Putu Agus Mahendra, S.Sos., M.M.', 'Dosen Tetap', 'dosen', 'Lektor', 'agus.mahendra@undhira.ac.id', '081234560009'],
    [facFikom, 'NIP0002FIKOM', 'Ni Made Ayu Krisna Dewi, A.Md.', 'Staf Administrasi', 'tendik', null, 'ayu.krisna@undhira.ac.id', '081234560010'],
    [facFti, '0017068609', 'Dr. I Gede Adi Saputra, S.Kom., M.T.', 'Dosen Tetap', 'dosen', 'Lektor Kepala', 'gede.saputra@undhira.ac.id', '081234560011'],
    [facFti, '0009079310', 'I Kadek Agus Setiawan, S.Kom., M.Cs.', 'Dosen Tetap', 'dosen', 'Lektor', 'kadek.setiawan@undhira.ac.id', '081234560012'],
    [facFti, '0022089411', 'Ni Putu Ayu Indah Paramitha, S.T., M.T.', 'Dosen Tetap', 'dosen', 'Asisten Ahli', 'ayu.paramitha@undhira.ac.id', '081234560013'],
    [facFti, '0031079012', 'I Wayan Gede Mahendra Putra, S.T., M.T.', 'Dosen Tetap', 'dosen', 'Lektor', 'wayan.mahendra@undhira.ac.id', '081234560014'],
    [facFti, 'NIP0003FTI', 'Kadek Budhi Artawan, S.Kom.', 'Laboran/Teknisi', 'tendik', null, 'budhi.artawan@undhira.ac.id', '081234560015'],
    [facLpkOps, 'LPK0001', 'I Nyoman Wira Sanjaya, S.Pd.', 'Instruktur Pelatihan', 'tendik', null, 'wira.sanjaya@lpkdhyanapura.id', '081234560016'],
    [facLpkOps, 'LPK0002', 'Ni Wayan Krismawati, S.Pd.', 'Instruktur Pelatihan', 'tendik', null, 'wayan.krismawati@lpkdhyanapura.id', '081234560017'],
    [facLpkAdm, 'LPK0003', 'I Made Suarjana, A.Md.', 'Staf Sertifikasi', 'tendik', null, 'made.suarjana@lpkdhyanapura.id', '081234560018'],
    [facPtRec, 'PT0001', 'Putu Eka Yuliantari, S.Psi.', 'Staf Rekrutmen', 'tendik', null, 'eka.yuliantari@dhyanapuratalenta.id', '081234560019'],
    [facPtAdm, 'PT0002', 'I Komang Adi Wirawan, S.H.', 'Staf Legal & Kontrak', 'tendik', null, 'komang.wirawan@dhyanapuratalenta.id', '081234560020'],
  ];
  const empIds = {};
  employees.forEach(row => {
    const id = insEmp.run(...row).lastInsertRowid;
    empIds[row[1]] = id; // map nip -> id
  });
  console.log(`✅ ${employees.length} pegawai dibuat lintas 3 unit (15 Universitas, 3 LPK, 2 PT)`);

  // ── USERS ──────────────────────────────────────────────────
  const insUser = db.prepare(`
    INSERT INTO users (username, password_hash, email, role, scope_org_unit_id, employee_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  insUser.run('yayasan', hash('yayasan2024'), 'yayasan@dhyanapura.or.id', 'yayasan', null, null);
  insUser.run('admin', hash('admin2024'), 'admin@undhira.ac.id', 'admin', null, null);
  insUser.run('rektor', hash('damai2024'), 'rektor@undhira.ac.id', 'pimpinan', unitUndhira, null);
  insUser.run('kalpk', hash('damai2024'), 'kepala@lpkdhyanapura.id', 'pimpinan', unitLpk, null);
  insUser.run('dirptptk', hash('damai2024'), 'direktur@dhyanapuratalenta.id', 'pimpinan', unitPt, null);
  insUser.run('dekan.feb', hash('damai2024'), 'made.artawan@undhira.ac.id', 'manajer_unit', null, empIds['0011078301']);
  insUser.run('dosen1', hash('damai2024'), 'made.artawan@undhira.ac.id', 'dosen_tendik', null, empIds['0011078301']);
  insUser.run('dosen2', hash('damai2024'), 'ketut.rasmini@undhira.ac.id', 'dosen_tendik', null, empIds['0025068902']);
  insUser.run('instruktur1', hash('damai2024'), 'wira.sanjaya@lpkdhyanapura.id', 'dosen_tendik', null, empIds['LPK0001']);
  insUser.run('staf.pt1', hash('damai2024'), 'eka.yuliantari@dhyanapuratalenta.id', 'dosen_tendik', null, empIds['PT0001']);
  insUser.run('mahasiswa1', hash('damai2024'), 'mhs1@student.undhira.ac.id', 'mahasiswa', unitUndhira, null);
  console.log('✅ 11 user dibuat (yayasan, admin, 3 pimpinan unit, dekan, 4 dosen/tendik, 1 mahasiswa)');

  // ── KPI ENTRIES & DAMAI SCORES (seeded deterministically) ──
  const allIndicators = db.prepare('SELECT ki.*, kd.code as dim_code FROM kpi_indicators ki JOIN kpi_dimensions kd ON ki.dimension_id = kd.id').all();
  const { normalizeKpi, getCategory } = require('../utils/damai-engine');

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  const RANGES = {
    1: [88, 99], 2: [85, 100], 3: [82, 98], 4: [88, 100],
    5: [78, 95], 6: [80, 97], 7: [80, 96], 8: [78, 95],
    9: [3.5, 4.9], 10: [1, 4], 11: [75, 95], 12: [72, 92],
    13: [70, 92], 14: [65, 90], 15: [72, 92], 16: [70, 92],
    17: [1, 4], 18: [0, 3], 19: [60, 95], 20: [50, 80],
  };

  const insEntry = db.prepare(`
    INSERT INTO kpi_entries (employee_id, period_id, kpi_indicator_id, actual_value, normalized_score, status, entered_by)
    VALUES (?, ?, ?, ?, ?, 'approved', 1)
  `);
  const insScore = db.prepare(`
    INSERT INTO damai_scores (employee_id, period_id, score_disiplin, score_amanah, score_melayani, score_adaptif, score_inovatif, total_score, category, color_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const periodsToSeed = [periodGenap2425, periodGanjil2526];
  let empIndex = 0;
  for (const empNip of Object.keys(empIds)) {
    const employeeId = empIds[empNip];
    periodsToSeed.forEach((periodId, pIdx) => {
      const dimScores = { D: [], A: [], M: [], AD: [], I: [] };
      allIndicators.forEach(ind => {
        const range = RANGES[ind.kpi_number] || [70, 95];
        const r = seededRandom(empIndex * 137 + ind.kpi_number * 7 + pIdx * 311 + 1);
        const actual = Math.round((range[0] + r * (range[1] - range[0])) * 100) / 100;
        const score = normalizeKpi(actual, ind);
        insEntry.run(employeeId, periodId, ind.id, actual, score);
        dimScores[ind.dim_code].push(score);
      });
      const avg = arr => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
      const sD = avg(dimScores.D), sA = avg(dimScores.A), sM = avg(dimScores.M), sAD = avg(dimScores.AD), sI = avg(dimScores.I);
      const total = Math.round((sD * 0.20 + sA * 0.25 + sM * 0.25 + sAD * 0.15 + sI * 0.15) * 100) / 100;
      const cat = getCategory(total);
      insScore.run(employeeId, periodId, sD, sA, sM, sAD, sI, total, cat.name, cat.color);
    });
    empIndex++;
  }
  console.log(`✅ KPI entries & skor DAMAI dihitung untuk ${Object.keys(empIds).length} pegawai × 2 periode`);

  // ── PERFORMANCE REVIEWS ────────────────────────────────────
  const insReview = db.prepare(`
    INSERT INTO performance_reviews (employee_id, period_id, reviewer_id, strengths, improvements, action_plan, reviewer_notes, status)
    VALUES (?, ?, (SELECT id FROM users WHERE username=?), ?, ?, ?, ?, ?)
  `);
  const reviews = [
    [empIds['0011078301'], periodGanjil2526, 'admin',
      'Disiplin tinggi, kehadiran selalu di atas target. Aktif dalam kegiatan penelitian dan publikasi.',
      'Perlu meningkatkan kolaborasi lintas unit dan pengembangan inovasi digital.',
      'Mengikuti pelatihan inovasi digital Q3 2026 dan berpartisipasi dalam program kolaborasi antar fakultas.',
      'Kinerja keseluruhan sangat baik. Direkomendasikan untuk program pengembangan kepemimpinan.', 'finalized'],
    [empIds['0025068902'], periodGanjil2526, 'admin',
      'Sangat amanah dalam pengelolaan keuangan dan akuntabilitas output kerja.',
      'Response time layanan perlu ditingkatkan agar lebih responsif terhadap kebutuhan mahasiswa.',
      'Implementasi sistem ticketing untuk monitoring response time mulai Agustus 2026.',
      'Secara umum kinerja baik. Perlu pendampingan dalam peningkatan kecepatan layanan.', 'finalized'],
    [empIds['0018059203'], periodGanjil2526, 'admin',
      'Inovatif dalam pengembangan metode pembelajaran dan adopsi teknologi digital.',
      'Kehadiran dan ketepatan waktu laporan perlu lebih konsisten.',
      'Coaching reguler setiap 2 minggu dengan ketua program studi untuk monitoring disiplin.',
      'Potensi besar namun perlu pembinaan disiplin yang lebih intensif.', 'finalized'],
    [empIds['LPK0001'], periodGanjil2526, 'kalpk',
      'Metode pelatihan interaktif dan tingkat kelulusan peserta sangat tinggi.',
      'Perlu memperbarui modul pelatihan agar sesuai standar kompetensi terbaru.',
      'Mengikuti TOT (Training of Trainer) bersertifikasi BNSP pada Q3 2026.',
      'Instruktur dengan kinerja sangat baik, layak menjadi mentor instruktur baru.', 'finalized'],
    [empIds['LPK0003'], periodGanjil2526, 'kalpk',
      'Akurat dalam administrasi sertifikasi dan taat prosedur.',
      'Kecepatan pemrosesan dokumen sertifikasi peserta perlu ditingkatkan.',
      'Pelatihan sistem informasi sertifikasi digital pada Agustus 2026.',
      'Kinerja cukup baik, perlu dukungan sistem agar lebih efisien.', 'reviewed'],
    [empIds['PT0001'], periodGanjil2526, 'dirptptk',
      'Jaringan mitra perusahaan luas, tingkat penempatan tenaga kerja tinggi.',
      'Dokumentasi proses rekrutmen perlu lebih sistematis dan terarsip digital.',
      'Implementasi CRM rekrutmen digital mulai Q3 2026.',
      'Kinerja sangat baik, kontribusi besar terhadap pencapaian target penempatan.', 'finalized'],
    [empIds['PT0002'], periodGanjil2526, 'dirptptk',
      'Teliti dalam penyusunan kontrak kerja dan kepatuhan regulasi ketenagakerjaan.',
      'Waktu respons terhadap pertanyaan klien perlu dipercepat.',
      'Penyusunan SOP respons klien dengan target waktu maksimal 1 hari kerja.',
      'Kinerja baik dari sisi kepatuhan hukum, perlu penguatan sisi pelayanan.', 'submitted'],
  ];
  reviews.forEach(row => insReview.run(...row));
  console.log(`✅ ${reviews.length} performance review dibuat lintas unit`);

  // ── NOTIFICATIONS (contoh) ─────────────────────────────────
  const insNotif = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES ((SELECT id FROM users WHERE username=?), ?, ?, ?)
  `);
  insNotif.run('dosen1', 'Periode Penilaian Aktif', 'Semester Genap 2025/2026 telah dibuka. Silakan lengkapi data KPI Anda.', 'info');
  insNotif.run('dekan.feb', 'KPI Menunggu Persetujuan', '2 pegawai FEB belum submit data KPI periode ini.', 'warning');
  insNotif.run('rektor', 'Ringkasan Skor DAMAI', 'Rata-rata skor DAMAI Universitas periode ini: 78.4 (Baik).', 'success');
  console.log('✅ Notifikasi contoh dibuat');

  console.log('\n🎉 Seeding selesai!\n');
  console.log('═══════════════════════════════════════════');
  console.log('AKUN DEMO:');
  console.log('  Yayasan         : yayasan / yayasan2024');
  console.log('  Admin           : admin / admin2024');
  console.log('  Rektor (Undhira): rektor / damai2024');
  console.log('  Kepala LPK      : kalpk / damai2024');
  console.log('  Direktur PT     : dirptptk / damai2024');
  console.log('  Dekan FEB       : dekan.feb / damai2024');
  console.log('  Dosen           : dosen1 / damai2024');
  console.log('  Instruktur LPK  : instruktur1 / damai2024');
  console.log('  Staf PT         : staf.pt1 / damai2024');
  console.log('═══════════════════════════════════════════\n');
}

seed();
