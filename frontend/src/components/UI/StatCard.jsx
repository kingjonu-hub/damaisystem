import React from 'react';

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  primary: { bg: 'bg-primary-50', icon: 'text-primary-700', border: 'border-primary-100' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 truncate">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-0.5 leading-none">{value}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
