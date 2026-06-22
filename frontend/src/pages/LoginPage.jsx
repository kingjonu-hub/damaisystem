import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff, Shield } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Ketua Yayasan', desc: 'Lintas unit: Undhira+LPK+PT', u: 'yayasan', p: 'yayasan2024' },
  { label: 'Admin', desc: 'Akses penuh sistem', u: 'admin', p: 'admin2024' },
  { label: 'Rektor', desc: 'Strategis Universitas', u: 'rektor', p: 'damai2024' },
  { label: 'Dekan FEB', desc: 'Manajer unit fakultas', u: 'dekan.feb', p: 'damai2024' },
  { label: 'Dosen', desc: 'Profil & skor pribadi', u: 'dosen1', p: 'damai2024' },
  { label: 'Kepala LPK', desc: 'Pimpinan unit LPK', u: 'kalpk', p: 'damai2024' },
  { label: 'Direktur PT', desc: 'Pimpinan unit PT Talenta', u: 'dirptptk', p: 'damai2024' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  async function doLogin(username, password) {
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      toast.success('Selamat datang di Sistem Informasi DAMAI!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Username dan password wajib diisi'); return; }
    doLogin(form.username, form.password);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-2xl shadow-2xl overflow-hidden">

          <div className="bg-gradient-to-br from-primary-700 to-primary-900 p-10 flex flex-col justify-center text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">DAMAI</h1>
            <p className="text-primary-200 text-sm mt-2 leading-relaxed">
              Sistem Informasi Pengukuran Kinerja<br/>Budaya Kerja Yayasan Dhyana Pura
            </p>
            <div className="mt-8 space-y-3">
              {[
                ['Disiplin', '#a5b4fc'], ['Amanah', '#c4b5fd'], ['Melayani', '#7dd3fc'],
                ['Adaptif', '#86efac'], ['Inovatif', '#fdba74'],
              ].map(([d, c]) => (
                <div key={d} className="flex items-center gap-2 text-xs text-primary-100">
                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />{d}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-primary-300 mt-10">Dikembangkan oleh Jatmiko Wahyu Nugroho · v3.0</p>
          </div>

          <div className="p-10">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-400 mb-6">Gunakan kredensial Anda atau pilih akun demo di bawah</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 font-medium">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <input type="text" className="input" placeholder="contoh: admin" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus autoComplete="username" />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memverifikasi...</>
                  : <><LogIn className="w-5 h-5" /> Masuk</>}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3 text-center">Akun Demo — Klik untuk Masuk</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(d => (
                  <button key={d.u} type="button" onClick={() => doLogin(d.u, d.p)}
                    className="text-left px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                    <p className="text-xs font-bold text-primary-700">{d.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
