import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import PageHeader from '../components/UI/PageHeader';
import ScopeBanner from '../components/UI/ScopeBanner';
import { TableSkeleton } from '../components/UI/Skeleton';
import { formatDate } from '../utils/helpers';
import { FileText, Plus, Eye, Pencil, Search } from 'lucide-react';

const STATUS_MAP = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Disubmit', cls: 'bg-blue-50 text-blue-700' },
  reviewed: { label: 'Ditinjau', cls: 'bg-yellow-50 text-yellow-700' },
  finalized: { label: 'Final', cls: 'bg-green-50 text-green-700' },
};

const EMPTY_FORM = { employee_id: '', period_id: '', strengths: '', improvements: '', action_plan: '', reviewer_notes: '', status: 'draft' };

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null, view: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [scopeLabel, setScopeLabel] = useState('');

  // Hanya role berikut yang BISA membuat/mengubah review (sesuai backend authorize())
  const canManage = ['admin', 'pimpinan', 'manajer_unit', 'yayasan'].includes(user.role);

  useEffect(() => {
    loadAll();
    if (canManage) {
      // Daftar pegawai yang muncul di dropdown otomatis dibatasi backend sesuai scope user
      api.get('/employees?is_active=1&limit=200').then(r => setEmployees(r.data.data || []));
    }
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([api.get('/reviews'), api.get('/periods')]);
      setReviews(r.data.data || []);
      setScopeLabel(r.data.scope_label || '');
      setPeriods(p.data.data || []);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }

  function openAdd() { setForm({ ...EMPTY_FORM }); setModal({ open: true, data: null, view: false }); }
  function openEdit(r) { setForm({ ...r, employee_id: String(r.employee_id), period_id: String(r.period_id) }); setModal({ open: true, data: r, view: false }); }
  function openView(r) { setModal({ open: true, data: r, view: true }); }
  function closeModal() { setModal({ open: false, data: null, view: false }); }

  async function handleSave() {
    if (!form.employee_id || !form.period_id) { toast.error('Pilih pegawai dan periode terlebih dahulu'); return; }
    setSaving(true);
    try {
      await api.post('/reviews', form);
      toast.success(modal.data ? 'Review berhasil diperbarui' : 'Review berhasil dibuat');
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  async function handleUpdateStatus(id, status) {
    try {
      await api.put(`/reviews/${id}/status`, { status });
      toast.success('Status diperbarui');
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal memperbarui status'); }
  }

  const filtered = reviews.filter(r => {
    const ms = !search || r.employee_name?.toLowerCase().includes(search.toLowerCase());
    const mst = !filterStatus || r.status === filterStatus;
    return ms && mst;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Performance Review" subtitle="Catatan dan evaluasi kinerja civitas akademika" icon={FileText}
        actions={canManage && <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Buat Review</button>} />

      <ScopeBanner label={scopeLabel} count={filtered.length} total={reviews.length} />

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama pegawai..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="text-xs text-slate-400">{filtered.length} review</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Civitas</th><th>Unit / Fakultas</th><th>Periode</th><th>Reviewer</th><th>Status</th><th>Diperbarui</th>
                  {canManage && <th>Ubah Status</th>}<th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const st = STATUS_MAP[r.status] || STATUS_MAP.draft;
                  return (
                    <tr key={r.id}>
                      <td><p className="text-sm font-semibold text-slate-800">{r.employee_name}</p><p className="text-[10px] text-slate-400">{r.nip_nidn}</p></td>
                      <td>
                        <div className="flex gap-1">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-full">{r.org_unit_code}</span>
                          <span className="text-[10px] text-slate-500">{r.faculty_name}</span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-500">{r.period_name}</td>
                      <td className="text-xs text-slate-500">{r.reviewer_username}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="text-xs text-slate-400">{formatDate(r.updated_at)}</td>
                      {canManage && (
                        <td>
                          <select className="input py-1 text-xs w-32" value={r.status} onChange={e => handleUpdateStatus(r.id, e.target.value)}>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openView(r)} className="btn-ghost py-1 px-2 text-xs" title="Lihat"><Eye className="w-3.5 h-3.5" /></button>
                          {canManage && <button onClick={() => openEdit(r)} className="btn-ghost py-1 px-2 text-xs" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={canManage ? 8 : 7} className="text-center text-sm text-slate-400 py-12">
                    {reviews.length === 0 ? 'Belum ada data review pada cakupan akses Anda' : 'Tidak ada review yang sesuai filter'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal open={modal.open && modal.view} onClose={closeModal} title="Detail Performance Review" size="lg">
        {modal.data && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div><p className="text-xs text-slate-400 mb-1">Civitas</p><p className="text-sm font-bold text-slate-800">{modal.data.employee_name}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Periode</p><p className="text-sm font-semibold text-slate-700">{modal.data.period_name}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Reviewer</p><p className="text-sm text-slate-700">{modal.data.reviewer_username}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Status</p>
                <span className={`badge ${(STATUS_MAP[modal.data.status] || STATUS_MAP.draft).cls}`}>{(STATUS_MAP[modal.data.status] || STATUS_MAP.draft).label}</span>
              </div>
            </div>
            {[
              { label: '💪 Kekuatan / Strengths', value: modal.data.strengths, color: 'border-green-300 bg-green-50' },
              { label: '📈 Area Pengembangan', value: modal.data.improvements, color: 'border-orange-300 bg-orange-50' },
              { label: '🎯 Rencana Aksi', value: modal.data.action_plan, color: 'border-blue-300 bg-blue-50' },
              { label: '📝 Catatan Reviewer', value: modal.data.reviewer_notes, color: 'border-purple-300 bg-purple-50' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs font-bold text-slate-600 mb-2">{f.label}</p>
                <div className={`text-sm text-slate-700 rounded-xl p-4 border leading-relaxed ${f.color}`}>{f.value || <em className="text-slate-400">Tidak diisi</em>}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={modal.open && !modal.view} onClose={closeModal} title={modal.data ? 'Edit Performance Review' : 'Buat Performance Review'} size="lg">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pegawai * <span className="text-[10px] text-slate-400 normal-case">(daftar dibatasi sesuai cakupan akses Anda)</span></label>
              <select className="input" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} disabled={!!modal.data}>
                <option value="">-- Pilih Pegawai --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.org_unit_code}/{e.faculty_code})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Periode *</label>
              <select className="input" value={form.period_id} onChange={e => setForm(f => ({ ...f, period_id: e.target.value }))} disabled={!!modal.data}>
                <option value="">-- Pilih Periode --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {[
            { key: 'strengths', label: '💪 Kekuatan / Strengths', placeholder: 'Uraikan kekuatan dan pencapaian civitas...' },
            { key: 'improvements', label: '📈 Area Pengembangan', placeholder: 'Area yang perlu ditingkatkan...' },
            { key: 'action_plan', label: '🎯 Rencana Aksi', placeholder: 'Langkah konkret yang akan diambil...' },
            { key: 'reviewer_notes', label: '📝 Catatan Reviewer', placeholder: 'Catatan tambahan dari reviewer...' },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <textarea className="input resize-none" rows={3} placeholder={f.placeholder} value={form[f.key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </div>
          ))}

          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button onClick={closeModal} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving || !form.employee_id || !form.period_id} className="btn-primary">
              {saving ? 'Menyimpan...' : 'Simpan Review'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
