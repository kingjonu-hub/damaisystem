import React from 'react';
import { getCategoryConfig, formatScore } from '../../utils/helpers';

export default function ScoreBadge({ score, size = 'sm' }) {
  const cat = getCategoryConfig(score);
  const sizeClass = size === 'lg' ? 'text-lg font-black px-3 py-1' : 'text-xs font-bold px-2 py-0.5';
  return (
    <span className={`inline-flex items-center rounded-full ${sizeClass}`} style={{ color: cat.color, background: `${cat.color}18` }}>
      {formatScore(score)}
    </span>
  );
}
