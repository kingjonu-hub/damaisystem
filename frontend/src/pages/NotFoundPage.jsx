import React from 'react';
import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <CompassIcon className="w-14 h-14 text-slate-300 mb-4" />
      <h1 className="text-2xl font-black text-slate-800">404 — Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-slate-500 mt-2 mb-6">Halaman yang Anda cari tidak tersedia atau Anda tidak memiliki akses.</p>
      <Link to="/dashboard" className="btn-primary">Kembali ke Dashboard</Link>
    </div>
  );
}
