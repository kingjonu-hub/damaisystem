import React from 'react';

export function CardSkeleton({ height = 'h-32' }) {
  return <div className={`card ${height} skeleton`} />;
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton h-4 w-8 rounded" />
          <div className="skeleton h-4 flex-1 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
