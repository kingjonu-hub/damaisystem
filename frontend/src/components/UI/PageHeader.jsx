import React from 'react';

export default function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-700" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-black text-slate-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
