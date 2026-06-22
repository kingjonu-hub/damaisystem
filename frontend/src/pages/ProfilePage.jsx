import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/UI/PageHeader';
import { getRoleLabel, formatDate } from '../utils/helpers';
import { User, KeyRound, Shield, Mail, Building2, BadgeCheck, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Password baru dan konfirmasi tidak cocok'); return; }
    if (passForm.newPassword.length < 6) { toast.error('Password baru minimal 6 karakter'); return; }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password berhasil diubah');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal mengubah password'); }
    finally { setSaving(false); }
  }

  const infoItems = [
    { label: 'Username', value: user?.username, icon: User },
    { label: 'Email', value: user?.email, icon: Mail },
    { label: 'Role / Akses', value: getRoleLabel(user?.role), icon: Shield },
    { label: 'Cakupan Akses', value: user?.scope_label, icon: Shield },
    { label: 'Nama Lengkap', value: user?.employee_name || '–', icon: BadgeCheck },
    { label: 'NIP / NIDN', value: user?.nip_nidn || '–', icon: BadgeCheck },
    { label: 'Jabatan', value: user?.position || '–', icon: BadgeCheck },
    { label: 'Unit / Fakultas', value: user?.org_unit_name ? `${user.org_unit_name}${user.faculty_name ? ' — ' + user.faculty_name : ''}` : '–', icon: Building2 },
    { label: 'Bergabung', value: formatDate(user?.created_at), icon: BadgeCheck },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageHeader title="Profil Saya" subtitle="Informasi akun dan pengaturan keamanan" icon={User} />

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-800 to-primary-700 px-6 py-8 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-black text-white">{(user?.employee_name || user?.username || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user?.employee_name || user?.username}</h2>
            <p className="text-primary-200 text-sm mt-0.5">{getRoleLabel(user?.role)}</p>
            {user?.org_unit_name && <p className="text-primary-300 text-xs mt-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> {user.org_unit_name}</p>}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoItems.map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5"><item.icon className="w-4 h-4 text-slate-500" /></div>
              <div><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{item.value || '–'}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><KeyRound className="w-4 h-4 text-orange-600" /></div>
          <div><h3 className="text-sm font-bold text-slate-800">Ganti Password</h3><p className="text-xs text-slate-400">Gunakan password yang kuat dan unik</p></div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          {[
            { key: 'currentPassword', label: 'Password Saat Ini', placeholder: 'Masukkan password lama...' },
            { key: 'newPassword', label: 'Password Baru', placeholder: 'Minimal 6 karakter...' },
            { key: 'confirmPassword', label: 'Konfirmasi Password Baru', placeholder: 'Ulangi password baru...' },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={showPass ? 'text' : 'password'} className="input" placeholder={f.placeholder} value={passForm[f.key]}
                onChange={e => setPassForm(prev => ({ ...prev, [f.key]: e.target.value }))} minLength={f.key !== 'currentPassword' ? 6 : undefined} />
            </div>
          ))}
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input type="checkbox" className="w-3.5 h-3.5 accent-primary-700" checked={showPass} onChange={e => setShowPass(e.target.checked)} />Tampilkan password
          </label>
          {passForm.newPassword && passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
            <p className="text-xs text-red-600 font-medium">⚠ Password baru dan konfirmasi tidak cocok</p>
          )}
          <button type="submit" disabled={saving || !passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword} className="btn-primary">
            <Save className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
