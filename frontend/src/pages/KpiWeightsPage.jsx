import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/UI/PageHeader';
import { getDimColor } from '../utils/helpers';
import { Sliders, Save, AlertTriangle, RotateCcw } from 'lucide-react';

export default function KpiWeightsPage() {
  const [dimensions, setDimensions] = useState([]);
  const [draft, setDraft] = useState({}); // { id: weightPercent }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/kpi/dimensions');
      const dims = r.data.data || [];
      setDimensions(dims);
      const d = {};
      dims.forEach(dim => { d[dim.id] = Math.round(dim.weight * 10000) / 100; }); // simpan sebagai persen, presisi 2 desimal
      setDraft(d);
    } catch { toast.error('Gagal memuat data dimensi KPI'); }
    finally { setLoading(false); }
  }

  function setWeight(id, percentValue) {
    setDraft(prev => ({ ...prev, [id]: percentValue }));
  }

  function resetDraft() {
    const d = {};
    dimensions.forEach(dim => { d[dim.id] = Math.round(dim.weight * 10000) / 100; });
    setDraft(d);
    toast.success('Perubahan dibatalkan, dikembalikan ke nilai tersimpan');
  }

  const totalPercent = Object.values(draft).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const roundedTotal = Math.round(totalPercent * 100) / 100;
  const isValid = roundedTotal === 100;
  const hasChanges = dimensions.some(dim => {
    const original = Math.round(dim.weight * 10000) / 100;
    return original !== draft[dim.id];
  });

  async function handleSave() {
    if (!isValid) { toast.error(`Total bobot harus tepat 100%. Saat ini: ${roundedTotal}%`); return; }
    setSaving(true);
    try {
      const weights = dimensions.map(dim => ({ id: dim.id, weight: Math.round((parseFloat(draft[dim.id]) / 100) * 10000) / 10000 }));
      const res = await api.put('/kpi/dimensions/weights', { weights });
      toast.success(res.data.message || 'Bobot dimensi berhasil diperbarui');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan perubahan bobot');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageHeader title="Pengaturan Bobot KPI" subtitle="Ubah persentase bobot tiap dimensi DAMAI dalam perhitungan skor total" icon={Sliders} />

      <div className="card p-4 flex items-start gap-3 border-l-4 border-amber-400 bg-amber-50">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Perubahan ini berdampak luas</p>
          <p className="text-xs mt-1 leading-relaxed">
            Mengubah bobot akan otomatis menghitung ulang <strong>seluruh skor DAMAI</strong> yang sudah ada di semua periode
            (historis maupun aktif). Total kelima bobot harus tepat <strong>100%</strong> sebelum dapat disimpan.
          </p>
        </div>
      </div>

      <div className="card p-6">
        {loading ? (
          <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton rounded" />)}</div>
        ) : (
          <>
            <div className="space-y-5">
              {dimensions.map(dim => {
                const color = getDimColor(dim.code);
                const value = draft[dim.id] ?? 0;
                return (
                  <div key={dim.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: color }}>{dim.code}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{dim.name}</p>
                          <p className="text-[10px] text-slate-400">{dim.indicators.length} indikator KPI</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={100} step={0.5}
                          className="input w-20 text-right font-bold py-1.5"
                          value={value}
                          onChange={e => setWeight(dim.id, e.target.value)}
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                      </div>
                    </div>
                    <input
                      type="range" min={0} max={100} step={0.5}
                      value={value}
                      onChange={e => setWeight(dim.id, e.target.value)}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: color, background: `linear-gradient(to right, ${color} ${value}%, #e2e8f0 ${value}%)` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className={`mt-6 p-4 rounded-xl flex items-center justify-between ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div>
                <p className={`text-sm font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>Total Bobot: {roundedTotal}%</p>
                <p className={`text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {isValid ? '✓ Valid — siap disimpan' : `Harus tepat 100% (selisih ${(100 - roundedTotal).toFixed(2)}%)`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetDraft} disabled={!hasChanges || saving} className="btn-secondary"><RotateCcw className="w-4 h-4" /> Batalkan</button>
                <button onClick={handleSave} disabled={!isValid || !hasChanges || saving} className="btn-primary">
                  <Save className="w-4 h-4" />{saving ? 'Menyimpan...' : 'Simpan & Hitung Ulang'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Formula Saat Ini</p>
        <p className="text-xs text-slate-600 font-mono">
          Skor DAMAI = {dimensions.map(d => `${d.code}×${Math.round(d.weight * 100)}%`).join(' + ')}
        </p>
      </div>
    </div>
  );
}
