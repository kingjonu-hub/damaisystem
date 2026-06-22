export function getCategoryConfig(score) {
  if (score === null || score === undefined) return {
    name: 'Belum Dinilai', color: '#94a3b8', bg: 'bg-slate-100', text: 'text-slate-600', badge: 'badge', icon: '—',
  };
  if (score >= 90) return { name: 'Sangat Baik', color: '#22c55e', bg: 'bg-green-100', text: 'text-green-800', badge: 'badge-sangat-baik', icon: '🏆' };
  if (score >= 80) return { name: 'Baik', color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-800', badge: 'badge-baik', icon: '⭐' };
  if (score >= 70) return { name: 'Cukup', color: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'badge-cukup', icon: '📈' };
  if (score >= 60) return { name: 'Kurang', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-800', badge: 'badge-kurang', icon: '⚠️' };
  return { name: 'Perlu Perhatian', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-800', badge: 'badge-perlu-perhatian', icon: '🚨' };
}

export function getRecommendation(score) {
  if (score === null || score === undefined) return 'Belum ada data penilaian untuk periode ini.';
  if (score >= 90) return 'Reward & Recognition — Pertahankan kinerja luar biasa ini dan jadilah role model bagi rekan sejawat.';
  if (score >= 80) return 'Pengembangan Potensi — Terus kembangkan kompetensi untuk mencapai level Sangat Baik.';
  if (score >= 70) return 'Coaching & Mentoring — Diperlukan bimbingan intensif untuk meningkatkan kinerja ke level berikutnya.';
  if (score >= 60) return 'Program Perbaikan Intensif — Segera ikuti program peningkatan kinerja yang disiapkan institusi.';
  return 'Evaluasi Kinerja & Rencana Aksi — Diperlukan evaluasi menyeluruh dan rencana aksi segera bersama atasan.';
}

export function formatScore(score) {
  if (score === null || score === undefined) return '–';
  return Number(score).toFixed(2);
}

export function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getRoleLabel(role) {
  const labels = {
    yayasan: 'Ketua Yayasan',
    admin: 'Administrator',
    pimpinan: 'Pimpinan Unit',
    manajer_unit: 'Manajer Unit',
    dosen_tendik: 'Dosen / Tendik',
    mahasiswa: 'Mahasiswa',
  };
  return labels[role] || role;
}

export const DIM_COLORS = { D: '#1e3a5f', A: '#7c3aed', M: '#0891b2', AD: '#16a34a', I: '#ea580c' };

export function getDimColor(code) { return DIM_COLORS[code] || '#64748b'; }

export function getDimLabel(code) {
  const labels = { D: 'Disiplin', A: 'Amanah', M: 'Melayani', AD: 'Adaptif', I: 'Inovatif' };
  return labels[code] || code;
}

export function clsx(...classes) { return classes.filter(Boolean).join(' '); }

export function truncate(str, n = 40) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}
