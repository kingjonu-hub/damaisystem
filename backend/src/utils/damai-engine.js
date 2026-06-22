/**
 * DAMAI Scoring Engine
 * Sistem Informasi DAMAI — Yayasan Dhyana Pura
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

function normalizeKpi(actual, indicator) {
  if (actual === null || actual === undefined) return null;

  let score;
  switch (indicator.normalization_type) {
    case 'percentage':
      score = Math.min((actual / indicator.target_value) * 100, 100);
      break;
    case 'likert_5':
      score = (actual / 5) * 100;
      break;
    case 'response_time':
      score = actual <= indicator.target_value
        ? 100
        : Math.max((indicator.target_value / actual) * 100, 0);
      break;
    case 'count':
      score = Math.min((actual / indicator.target_value) * 100, 100);
      break;
    case 'direct':
    default:
      score = actual;
      break;
  }

  return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
}

function calculateDimensionScore(normalizedScores) {
  const valid = normalizedScores.filter(s => s !== null && s !== undefined);
  if (valid.length === 0) return null;
  const avg = valid.reduce((sum, s) => sum + s, 0) / valid.length;
  return Math.round(avg * 100) / 100;
}

function getCategory(score) {
  if (score === null || score === undefined) return null;
  if (score >= 90) return { name: 'Sangat Baik', color: '#22c55e', recommendation: 'Reward & Recognition — Pertahankan kinerja luar biasa ini dan jadilah role model bagi rekan sejawat.' };
  if (score >= 80) return { name: 'Baik', color: '#3b82f6', recommendation: 'Pengembangan Potensi — Terus kembangkan kompetensi untuk mencapai level Sangat Baik.' };
  if (score >= 70) return { name: 'Cukup', color: '#eab308', recommendation: 'Coaching & Mentoring — Diperlukan bimbingan intensif untuk meningkatkan kinerja ke level berikutnya.' };
  if (score >= 60) return { name: 'Kurang', color: '#f97316', recommendation: 'Program Perbaikan Intensif — Segera ikuti program peningkatan kinerja yang disiapkan institusi.' };
  return { name: 'Perlu Perhatian', color: '#ef4444', recommendation: 'Evaluasi Kinerja & Rencana Aksi — Diperlukan evaluasi menyeluruh dan rencana aksi segera bersama atasan.' };
}

/**
 * dimensionWeights: { D: 0.20, A: 0.25, M: 0.25, AD: 0.15, I: 0.15 }
 */
function calculateDamaiScore(dimensionScores, dimensionWeights) {
  const codes = Object.keys(dimensionWeights);
  const hasAll = codes.every(c => dimensionScores[c] !== null && dimensionScores[c] !== undefined);

  if (hasAll) {
    const total = codes.reduce((sum, c) => sum + dimensionScores[c] * dimensionWeights[c], 0);
    return Math.round(total * 100) / 100;
  }

  // Partial scoring: proportionally re-weight by available dimensions
  let weightedSum = 0, totalWeight = 0;
  codes.forEach(c => {
    const s = dimensionScores[c];
    if (s !== null && s !== undefined) {
      weightedSum += s * dimensionWeights[c];
      totalWeight += dimensionWeights[c];
    }
  });
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

module.exports = {
  normalizeKpi,
  calculateDimensionScore,
  calculateDamaiScore,
  getCategory,
};
