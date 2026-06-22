import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function DimRadarChart({ score, size = 220 }) {
  const data = [
    { dim: 'Disiplin', val: score?.score_disiplin || 0 },
    { dim: 'Amanah', val: score?.score_amanah || 0 },
    { dim: 'Melayani', val: score?.score_melayani || 0 },
    { dim: 'Adaptif', val: score?.score_adaptif || 0 },
    { dim: 'Inovatif', val: score?.score_inovatif || 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fontFamily: 'Sora', fontWeight: 600 }} />
        <Radar dataKey="val" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.18} strokeWidth={2.5} />
        <Tooltip contentStyle={{ fontFamily: 'Sora', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
