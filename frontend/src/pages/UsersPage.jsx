import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import PageHeader from '../components/UI/PageHeader';
import { getRoleLabel, formatDateTime } from '../utils/helpers';
import { UserCog, Plus, KeyRound, Pencil, UserX, UserCheck, ShieldAlert } from 'lucide-react';

const EMPTY_FORM = { username: '', password: '', email: '', role: 'dosen_tendik', scope_org_unit_id: '', employee_id: '' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, data: null });
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Hanya admin yang melihat halaman ini punya kontrol penuh (yayasan read-only via guard route lain)
  const canManage = currentUser?.role === 'admin';

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, ou, emp] = await Promise.all([api.get('/users'), api.get('/org/units'), api.get('/employees?limit=200')]);
      setUsers(u.data.data || []);
      setUnits(ou.data.data || []);
      setEmployees(emp.data.data || []);
    } catch { toast.error('Gagal memuat data user'); }
    finally { setLoading(false); }
  }

  function openAdd() { setForm({ ...EMPTY_FORM }); setModal({ open: true, data: null }); }
  function openEdit(u) {
    setForm({
      username: u.username, password: '', email: u.email || '', role: u.role,
      scope_org_unit_id: u.scope_org_unit_id ? String(u.scope_org_unit_id) : '',
      employee_id: u.employee_id ? String(u.employee_id) : '',
      is_active: u.is_active,
    });
    setModal({ open: true, data: u });
  }
  function closeModal() { setModal({ open: false, data: null }); }

  async function handleSave() {
    if (!modal.data && (!form.username || !form.password)) { toast.error('Username dan password wajib diisi'); return; }
    setSaving(true);
    try {
      if (modal.data) {
        await api.put(`/users/${modal.data.id}`, form);
        toast.success('User berhasil diperbarui');
      } else {
        await api.post('/users', form);
        toast.success('User berhasil dibuat');
      }
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setSaving(true);
    try {
      await api.put(`/users/${resetModal.id}/reset-password`, { newPassword });
      toast.success('Password berhasil direset');
      setResetModal(null); setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal reset password'); }
    finally { setSaving(false); }
  }

  async function handleToggleActive(u) {
    const action = u.is_active ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!window.confirm(`Yakin ingin ${action} akun "${u.username}"?`)) return;
    try {
      if (u.is_active) {
        await api.delete(`/users/${u.id}`);
        toast.success('Akun berhasil dinonaktifkan');
      } else {
        await api.put(`/users/${u.id}`, { is_active: 1 });
        toast.success('Akun berhasil diaktifkan kembali');
      }
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal mengubah status akun'); }
  }

  const needsUnit = form.role === 'pimpinan';
  const needsEmployee = ['manajer_unit', 'dosen_tendik'].includes(form.role);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Manajemen User" subtitle="Admin sebagai super user — kelola seluruh akun & hak akses lintas role" icon={UserCog}
        actions={canManage && <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Tambah User</button>} />

      {!canManage && (
        <div className="card p-4 flex items-center gap-3 border-l-4 border-blue-400 bg-blue-50">
          <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">Anda melihat daftar ini dalam mode <strong>baca saja</strong>. Hanya Administrator yang dapat menambah, mengubah, atau menonaktifkan akun.</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Terkait</th><th>Status</th><th>Login Terakhir</th>{canManage && <th>Aksi</th>}</tr></thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUser?.id;
              const isProtectedAdmin = u.role === 'admin';
              return (
                <tr key={u.id}>
                  <td className="text-sm font-semibold text-slate-800">{u.username}{isSelf && <span className="text-[10px] text-primary-500 ml-1">(Anda)</span>}</td>
                  <td className="text-xs text-slate-500">{u.email || '–'}</td>
                  <td><span className="text-xs font-semibold px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full">{getRoleLabel(u.role)}</span></td>
                  <td className="text-xs text-slate-500">{u.employee_name || u.scope_unit_name || '–'}</td>
                  <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{u.is_active ? 'Aktif' : 'Non-aktif'}</span></td>
                  <td className="text-xs text-slate-400">{formatDateTime(u.last_login)}</td>
                  {canManage && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} className="btn-ghost py-1 px-2 text-xs" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setResetModal(u)} className="btn-ghost py-1 px-2 text-xs" title="Reset Password"><KeyRound className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isProtectedAdmin}
                          title={isProtectedAdmin ? 'Akun admin tidak dapat dinonaktifkan' : (u.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                          className="btn-ghost py-1 px-2 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {u.is_active ? <UserX className="w-3.5 h-3.5 text-red-400" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {users.length === 0 && !loading && <tr><td colSpan={canManage ? 7 : 6} className="text-center text-sm text-slate-400 py-12">Belum ada user</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.data ? `Edit User: ${modal.data.username}` : 'Tambah User Baru'}>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Username {!modal.data && '*'}</label>
              <input className="input" value={form.username} disabled={!!modal.data}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              {modal.data && <p className="text-[10px] text-slate-400 mt-1">Username tidak dapat diubah setelah dibuat</p>}
            </div>
            {!modal.data && (
              <div><label className="label">Password *</label><input type="password" className="input" placeholder="Minimal 6 karakter" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            )}
          </div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, scope_org_unit_id: '', employee_id: '' }))}>
              <option value="yayasan">Ketua Yayasan</option>
              <option value="admin">Administrator</option>
              <option value="pimpinan">Pimpinan Unit</option>
              <option value="manajer_unit">Manajer Unit (Dekan/Kepala Divisi)</option>
              <option value="dosen_tendik">Dosen / Tendik</option>
              <option value="mahasiswa">Mahasiswa</option>
            </select>
          </div>
          {needsUnit && (
            <div><label className="label">Unit yang Dipimpin *</label>
              <select className="input" value={form.scope_org_unit_id} onChange={e => setForm(f => ({ ...f, scope_org_unit_id: e.target.value }))}>
                <option value="">-- Pilih Unit --</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Pimpinan akan melihat seluruh fakultas/divisi di dalam unit ini saja.</p>
            </div>
          )}
          {needsEmployee && (
            <div><label className="label">Pegawai Terkait *</label>
              <select className="input" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                <option value="">-- Pilih Pegawai --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.faculty_code})</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {form.role === 'manajer_unit' ? 'Manajer unit akan melihat seluruh pegawai di fakultas/divisi yang sama dengan pegawai ini.' : 'Dosen/Tendik hanya akan melihat data dirinya sendiri.'}
              </p>
            </div>
          )}
          {modal.data && (
            <div><label className="label">Status Akun</label>
              <select className="input" value={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: parseInt(e.target.value) }))}>
                <option value={1}>Aktif</option><option value={0}>Non-aktif</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={closeModal} className="btn-secondary">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : modal.data ? 'Simpan Perubahan' : 'Buat User'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!resetModal} onClose={() => { setResetModal(null); setNewPassword(''); }} title={`Reset Password: ${resetModal?.username}`}>
        <div className="p-6 space-y-4">
          <div><label className="label">Password Baru</label><input type="password" className="input" placeholder="Minimal 6 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="btn-secondary">Batal</button>
            <button onClick={handleResetPassword} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Reset Password'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
