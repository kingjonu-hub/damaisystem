import React from 'react';
import { Info } from 'lucide-react';

export default function ScopeBanner({ label, count, total }) {
  if (!label) return null;
  return (
    <div className="scope-banner mb-5">
      <Info className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>Cakupan akses Anda:</strong> {label}
        {count !== undefined && (
          <> — menampilkan {count}{total !== undefined ? ` dari ${total}` : ''} data.</>
        )}
      </span>
    </div>
  );
}
