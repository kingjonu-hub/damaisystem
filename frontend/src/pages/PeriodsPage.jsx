import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import PageHeader from '../components/UI/PageHeader';
import { formatDate } from '../utils/helpers';
import { Calendar, Plus, Pencil } from 'lucide-react';

const STATUS_LABEL = { draft: 'Draft', active: 'Aktif', completed: 'Selesai' };
const STATUS_CLS = { draft: 'bg-slate-100 text-slate-600', active: 'bg-green-50 text-green-700', completed: 'bg-blue-50 text-blue-700' };

const EMPTY_FORM = { name: '', academic_year: '', semester: 'ganjil', start_date: '', end_date: '', status: 'draft' };

export default function PeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const r = await api.get('/periods'); setPeriods(r.data.data || []); }
    catch { toast.error('Gagal memuat data periode'); }
    finally { setLoading(false); }
  }

  function openAdd() { setForm({ ...EMPTY_FORM }); setModal({ open: true, data: null }); }
  function openEdit(p) { setForm({ ...p }); setModal({ open: true, data: p }); }
  function closeModal() { setModal({ open: false, data: null }); }

  async function handleSave() {
    if (!form.name || !form.start_date || !form.end_date) { toast.error('Lengkapi field wajib'); return; }
    setSaving(true);
    try {
      if (modal.data) { await api.put(`/periods/${modal.data.id}`, form); toast.success('Periode berhasil diperbarui'); }
      else { await api.post('/periods', form); toast.success('Periode berhasil dibuat'); }
      closeModal();
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Periode Penilaian" subtitle="Kelola periode/semester penilaian DAMAI" icon={Calendar}
        actions={<button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Tambah Periode</button>} />

      <div className="card overflow-hidden">
        <table className="table">
          <thead><tr><th>Nama Periode</th><th>Tahun Akademik</th><th>Semester</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id}>
                <td className="text-sm font-semibold text-slate-800">{p.name}</td>
                <td className="text-xs text-slate-500">{p.academic_year || '–'}</td>
                <td className="text-xs text-slate-500 capitalize">{p.semester || '–'}</td>
                <td className="text-xs text-slate-500">{formatDate(p.start_date)}</td>
                <td className="text-xs text-slate-500">{formatDate(p.end_date)}</td>
                <td><span className={`badge ${STATUS_CLS[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                <td><button onClick={() => openEdit(p)} className="btn-ghost py-1 px-2 text-xs"><Pencil className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
            {periods.length === 0 && !loading && <tr><td colSpan={7} className="text-center text-sm text-slate-400 py-12">Belum ada periode</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.data ? 'Edit Periode' : 'Tambah Periode Baru'}>
        <div className="p-6 space-y-4">
          <div><label className="label">Nama Periode *</label><input className="input" placeholder="Contoh: Semester Genap 2026/2027" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tahun Akademik</label><input className="input" placeholder="2026/2027" value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} /></div>
            <div><label className="label">Semester</label>
              <select className="input" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                <option value="ganjil">Ganjil</option><option value="genap">Genap</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Tanggal Mulai *</label><input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="label">Tanggal Selesai *</label><input type="date" className="input" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option><option value="active">Aktif</option><option value="completed">Selesai</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Mengaktifkan periode ini akan otomatis menutup periode aktif lainnya.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={closeModal} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
