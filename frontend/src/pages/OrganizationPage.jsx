import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/UI/Modal';
import PageHeader from '../components/UI/PageHeader';
import { Building2, Plus, Layers } from 'lucide-react';

const UNIT_TYPE_LABEL = { universitas: 'Universitas', lpk: 'LPK', ptptk: 'PT Penyalur Tenaga Kerja' };
const UNIT_TYPE_COLOR = { universitas: '#1e3a5f', lpk: '#0891b2', ptptk: '#7c3aed' };

export default function OrganizationPage() {
  const [units, setUnits] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitModal, setUnitModal] = useState(false);
  const [facModal, setFacModal] = useState(false);
  const [unitForm, setUnitForm] = useState({ code: '', name: '', type: 'universitas', description: '' });
  const [facForm, setFacForm] = useState({ code: '', name: '', org_unit_id: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, f] = await Promise.all([api.get('/org/units'), api.get('/org/faculties')]);
      setUnits(u.data.data || []);
      setFaculties(f.data.data || []);
    } catch { toast.error('Gagal memuat data organisasi'); }
    finally { setLoading(false); }
  }

  async function handleSaveUnit() {
    if (!unitForm.code || !unitForm.name) { toast.error('Lengkapi kode dan nama unit'); return; }
    setSaving(true);
    try {
      await api.post('/org/units', unitForm);
      toast.success('Unit berhasil ditambahkan');
      setUnitModal(false);
      setUnitForm({ code: '', name: '', type: 'universitas', description: '' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  async function handleSaveFaculty() {
    if (!facForm.code || !facForm.name || !facForm.org_unit_id) { toast.error('Lengkapi semua field wajib'); return; }
    setSaving(true);
    try {
      await api.post('/org/faculties', facForm);
      toast.success('Fakultas/divisi berhasil ditambahkan');
      setFacModal(false);
      setFacForm({ code: '', name: '', org_unit_id: '', description: '' });
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Unit & Fakultas/Divisi" subtitle="Struktur organisasi Yayasan Dhyana Pura" icon={Building2} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {units.map(unit => {
          const unitFacs = faculties.filter(f => f.org_unit_id === unit.id);
          const color = UNIT_TYPE_COLOR[unit.type];
          return (
            <div key={unit.id} className="card overflow-hidden">
              <div className="p-5 border-b border-slate-100" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: color }}>
                    {unit.code.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{unit.name}</p>
                    <p className="text-[10px] text-slate-400">{UNIT_TYPE_LABEL[unit.type]} · {unitFacs.length} fakultas/divisi</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {unitFacs.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                    <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-400">{f.code}</p>
                    </div>
                  </div>
                ))}
                {unitFacs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Belum ada fakultas/divisi</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setUnitModal(true)} className="btn-secondary"><Plus className="w-4 h-4" /> Tambah Unit</button>
        <button onClick={() => setFacModal(true)} className="btn-secondary"><Plus className="w-4 h-4" /> Tambah Fakultas/Divisi</button>
      </div>

      <Modal open={unitModal} onClose={() => setUnitModal(false)} title="Tambah Unit Organisasi">
        <div className="p-6 space-y-4">
          <div><label className="label">Kode Unit *</label><input className="input" placeholder="Contoh: UNDHIRA" value={unitForm.code} onChange={e => setUnitForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
          <div><label className="label">Nama Unit *</label><input className="input" placeholder="Contoh: Universitas Dhyana Pura" value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Tipe *</label>
            <select className="input" value={unitForm.type} onChange={e => setUnitForm(f => ({ ...f, type: e.target.value }))}>
              <option value="universitas">Universitas</option><option value="lpk">LPK</option><option value="ptptk">PT Penyalur Tenaga Kerja</option>
            </select>
          </div>
          <div><label className="label">Deskripsi</label><textarea className="input resize-none" rows={2} value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={() => setUnitModal(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSaveUnit} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={facModal} onClose={() => setFacModal(false)} title="Tambah Fakultas/Divisi">
        <div className="p-6 space-y-4">
          <div><label className="label">Unit Induk *</label>
            <select className="input" value={facForm.org_unit_id} onChange={e => setFacForm(f => ({ ...f, org_unit_id: e.target.value }))}>
              <option value="">-- Pilih Unit --</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div><label className="label">Kode *</label><input className="input" placeholder="Contoh: FEB" value={facForm.code} onChange={e => setFacForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
          <div><label className="label">Nama *</label><input className="input" placeholder="Contoh: Fakultas Ekonomi & Bisnis" value={facForm.name} onChange={e => setFacForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Deskripsi</label><textarea className="input resize-none" rows={2} value={facForm.description} onChange={e => setFacForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={() => setFacModal(false)} className="btn-secondary">Batal</button>
            <button onClick={handleSaveFaculty} disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
