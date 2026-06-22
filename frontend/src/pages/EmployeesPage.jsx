import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import PageHeader from '../components/UI/PageHeader';
import ScopeBanner from '../components/UI/ScopeBanner';
import { TableSkeleton } from '../components/UI/Skeleton';
import { Users, Plus, Pencil, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const EMPTY_FORM = { nip_nidn: '', name: '', faculty_id: '', position: '', employee_type: 'dosen', rank: '', email: '', phone: '', is_active: 1 };

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [scopeLabel, setScopeLabel] = useState('');

  const canEdit = ['admin', 'manajer_unit'].includes(user.role);
  const showUnitCol = ['yayasan', 'admin'].includes(user.role);

  const loadEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (filterType) params.set('employee_type', filterType);
      const res = await api.get(`/employees?${params}`);
      setEmployees(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      setScopeLabel(res.data.scope_label || '');
    } catch { toast.error('Gagal memuat data pegawai'); }
    finally { setLoading(false); }
  }, [search, filterType]);

  useEffect(() => { api.get('/org/faculties').then(r => setFaculties(r.data.data || [])); }, []);
  useEffect(() => { loadEmployees(1); }, [search, filterType]);

  function openAdd() { setForm({ ...EMPTY_FORM }); setModal({ open: true, data: null }); }
  function openEdit(e) { setForm({ ...e, faculty_id: String(e.faculty_id || ''), is_active: e.is_active }); setModal({ open: true, data: e }); }
  function closeModal() { setModal({ open: false, data: null }); }

  async function handleSave() {
    if (!form.nip_nidn || !form.name || !form.faculty_id || !form.position) { toast.error('Lengkapi field yang wajib diisi (*)'); return; }
    setSaving(true);
    try {
      if (modal.data) { await api.put(`/employees/${modal.data.id}`, form); toast.success('Data pegawai berhasil diperbarui'); }
      else { await api.post('/employees', form); toast.success('Pegawai berhasil ditambahkan'); }
      closeModal();
      loadEmployees(pagination.page);
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Manajemen Pegawai" subtitle="Data dosen dan tenaga kependidikan" icon={Users}
        actions={user.role === 'admin' && <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Tambah Pegawai</button>} />

      <ScopeBanner label={scopeLabel} count={pagination.total} />

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama, NIP/NIDN, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label mb-1">Tipe</label>
          <select className="input w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Semua</option><option value="dosen">Dosen</option><option value="tendik">Tendik</option>
          </select>
        </div>
        <div className="text-xs text-slate-400 self-end pb-2">{pagination.total} pegawai</div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>NIP/NIDN</th><th>Nama</th><th>Tipe</th><th>Jabatan</th><th>Fakultas/Divisi</th>
                  {showUnitCol && <th>Unit</th>}<th>Status</th>{canEdit && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((e, i) => (
                  <tr key={e.id}>
                    <td className="text-xs text-slate-400">{(pagination.page - 1) * 20 + i + 1}</td>
                    <td className="text-xs font-mono text-slate-600">{e.nip_nidn}</td>
                    <td><p className="text-sm font-semibold text-slate-800">{e.name}</p>{e.rank && <p className="text-[10px] text-slate-400">{e.rank}</p>}</td>
                    <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.employee_type === 'dosen' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{e.employee_type === 'dosen' ? 'Dosen' : 'Tendik'}</span></td>
                    <td className="text-xs text-slate-600">{e.position}</td>
                    <td><span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{e.faculty_code}</span></td>
                    {showUnitCol && (
                      <td><span className="text-xs font-semibold" style={{ color: e.org_unit_type === 'universitas' ? '#1e3a5f' : e.org_unit_type === 'lpk' ? '#0891b2' : '#7c3aed' }}>{e.org_unit_code}</span></td>
                    )}
                    <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{e.is_active ? 'Aktif' : 'Non-aktif'}</span></td>
                    {canEdit && <td><button onClick={() => openEdit(e)} className="btn-ghost py-1 px-2 text-xs"><Pencil className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan={showUnitCol ? 9 : 8} className="text-center text-sm text-slate-400 py-12">Tidak ada data pegawai pada cakupan akses ini</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total)</p>
            <div className="flex gap-2">
              <button onClick={() => loadEmployees(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-secondary py-1 px-2"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => loadEmployees(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="btn-secondary py-1 px-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.data ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          <div><label className="label">NIP / NIDN *</label><input className="input" value={form.nip_nidn} onChange={e => setForm(f => ({ ...f, nip_nidn: e.target.value }))} disabled={!!modal.data} /></div>
          <div><label className="label">Tipe Pegawai *</label>
            <select className="input" value={form.employee_type} onChange={e => setForm(f => ({ ...f, employee_type: e.target.value }))}>
              <option value="dosen">Dosen</option><option value="tendik">Tendik</option>
            </select>
          </div>
          <div className="col-span-2"><label className="label">Nama Lengkap *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Fakultas / Divisi *</label>
            <select className="input" value={form.faculty_id} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}>
              <option value="">-- Pilih --</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code}) — {f.org_unit_name}</option>)}
            </select>
          </div>
          <div><label className="label">Jabatan *</label><input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
          <div><label className="label">Pangkat / Golongan</label><input className="input" value={form.rank || ''} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">No. Telepon</label><input className="input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          {modal.data && (
            <div><label className="label">Status</label>
              <select className="input" value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: parseInt(e.target.value) }))}>
                <option value={1}>Aktif</option><option value={0}>Non-aktif</option>
              </select>
            </div>
          )}
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={closeModal} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : modal.data ? 'Simpan Perubahan' : 'Tambah Pegawai'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
