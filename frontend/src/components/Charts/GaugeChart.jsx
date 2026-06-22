import React from 'react';
import { getCategoryConfig, formatScore } from '../../utils/helpers';

export default function GaugeChart({ score, size = 160 }) {
  const cat = getCategoryConfig(score);
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2 + 10;
  const circumference = Math.PI * r;
  const pct = score == null ? 0 : Math.min(score, 100) / 100;
  const dash = circumference * pct;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={cat.color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`} style={{ transition: 'stroke-dasharray 0.6s ease-out' }} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize="28" fontWeight="700" fill="#1a202c">{formatScore(score)}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="13" fontWeight="600" fill={cat.color}>{cat.name}</text>
    </svg>
  );
}
