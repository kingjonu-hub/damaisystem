import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/UI/PageHeader';
import { getCategoryConfig, formatScore } from '../utils/helpers';
import { ClipboardList, Save, ChevronDown, ChevronUp, Info, CheckCircle2 } from 'lucide-react';

export default function KpiInputPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    Promise.all([api.get('/kpi/dimensions'), api.get('/periods')]).then(([dims, prs]) => {
      setDimensions(dims.data.data || []);
      setPeriods(prs.data.data || []);
      const active = prs.data.data?.find(p => p.status === 'active');
      if (active) setSelectedPeriod(String(active.id));
    });

    if (user.role === 'dosen_tendik') {
      setSelectedEmployee(String(user.employee_id));
    } else {
      // Daftar pegawai otomatis dibatasi backend sesuai scope (manajer_unit hanya melihat fakultasnya)
      api.get('/employees?is_active=1&limit=200').then(r => setEmployees(r.data.data || []));
    }
  }, []);

  useEffect(() => { if (selectedEmployee && selectedPeriod) loadEntries(); }, [selectedEmployee, selectedPeriod]);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await api.get(`/kpi/entries?employee_id=${selectedEmployee}&period_id=${selectedPeriod}`);
      const map = {};
      res.data.data.forEach(e => {
        map[e.kpi_indicator_id] = { actual_value: e.actual_value ?? '', notes: e.notes || '', status: e.status, normalized_score: e.normalized_score };
      });
      setEntries(map);
      const exp = {};
      dimensions.forEach(d => { exp[d.id] = true; });
      setExpanded(exp);
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal memuat data KPI'); }
    finally { setLoading(false); }
  }

  function setEntry(kpiId, field, value) {
    setEntries(prev => ({ ...prev, [kpiId]: { ...prev[kpiId], [field]: value } }));
  }

  function previewNorm(kpi, value) {
    if (value === '' || value === null || value === undefined || isNaN(parseFloat(value))) return null;
    const actual = parseFloat(value);
    let score;
    switch (kpi.normalization_type) {
      case 'percentage': score = Math.min((actual / kpi.target_value) * 100, 100); break;
      case 'likert_5': score = (actual / 5) * 100; break;
      case 'response_time': score = actual <= kpi.target_value ? 100 : (kpi.target_value / actual) * 100; break;
      case 'count': score = Math.min((actual / kpi.target_value) * 100, 100); break;
      default: score = actual;
    }
    return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
  }

  async function handleSave(status) {
    if (!selectedEmployee || !selectedPeriod) { toast.error('Pilih pegawai dan periode terlebih dahulu'); return; }
    setSaving(true);
    try {
      const entriesArr = Object.entries(entries)
        .filter(([, data]) => data.actual_value !== '' && data.actual_value !== null && data.actual_value !== undefined)
        .map(([kpiId, data]) => ({ kpi_indicator_id: parseInt(kpiId), actual_value: parseFloat(data.actual_value), notes: data.notes || null }));

      if (entriesArr.length === 0) { toast.error('Tidak ada data yang diisi'); return; }

      await api.post('/kpi/entries/bulk', { employee_id: parseInt(selectedEmployee), period_id: parseInt(selectedPeriod), entries: entriesArr, status });
      toast.success(status === 'submitted'
        ? `✅ ${entriesArr.length} KPI berhasil disubmit dan skor DAMAI dihitung ulang!`
        : `💾 ${entriesArr.length} KPI tersimpan sebagai draft`);
      loadEntries();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  function getDimCompletion(dim) {
    const total = dim.indicators.length;
    const filled = dim.indicators.filter(kpi => {
      const v = entries[kpi.id]?.actual_value;
      return v !== '' && v !== null && v !== undefined;
    }).length;
    return { filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
  }

  const overallFilled = dimensions.reduce((acc, d) => acc + d.indicators.filter(kpi => {
    const v = entries[kpi.id]?.actual_value;
    return v !== '' && v !== null && v !== undefined;
  }).length, 0);
  const overallTotal = dimensions.reduce((acc, d) => acc + d.indicators.length, 0);

  const selectedPeriodObj = periods.find(p => String(p.id) === selectedPeriod);
  const isPeriodLocked = selectedPeriodObj?.status === 'completed';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Input Data KPI" subtitle="Masukkan data KPI untuk perhitungan skor DAMAI" icon={ClipboardList} />

      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user.role !== 'dosen_tendik' && (
            <div>
              <label className="label">Pilih Pegawai * <span className="text-[10px] text-slate-400 normal-case">(daftar dibatasi sesuai cakupan akses Anda)</span></label>
              <select className="input" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                <option value="">-- Pilih Pegawai --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.faculty_code} ({e.employee_type})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Periode Penilaian *</label>
            <select className="input" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
              <option value="">-- Pilih Periode --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id} disabled={p.status === 'completed'}>
                  {p.name} {p.status === 'active' ? '✅ Aktif' : p.status === 'completed' ? '🔒 Selesai' : ''}
                </option>
              ))}
            </select>
            {selectedEmployee && selectedPeriod && overallTotal > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progres Pengisian</span><span className="font-bold">{overallFilled}/{overallTotal} indikator ({Math.round((overallFilled / overallTotal) * 100)}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(overallFilled / overallTotal) * 100}%`, background: overallFilled === overallTotal ? '#22c55e' : '#1e3a5f' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isPeriodLocked && selectedPeriod && (
        <div className="card p-4 flex items-center gap-3 border-l-4 border-orange-400 bg-orange-50">
          <Info className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700 font-medium">Periode ini sudah selesai. Data KPI hanya dapat dilihat, tidak dapat diedit.</p>
        </div>
      )}

      {selectedEmployee && selectedPeriod && !loading && dimensions.map(dim => {
        const comp = getDimCompletion(dim);
        return (
          <div key={dim.id} className="card overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(e => ({ ...e, [dim.id]: !e[dim.id] }))}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: '#1e3a5f' }}>{dim.code}</div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{dim.name}</p>
                  <p className="text-xs text-slate-400">Bobot: {(dim.weight * 100).toFixed(0)}% · {dim.indicators.length} Indikator</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: comp.pct === 100 ? '#22c55e' : '#94a3b8' }}>{comp.filled}/{comp.total}</p>
                  <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${comp.pct}%`, background: comp.pct === 100 ? '#22c55e' : '#1e3a5f' }} /></div>
                </div>
                {expanded[dim.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expanded[dim.id] && (
              <div className="border-t border-slate-100">
                <table className="table">
                  <thead><tr><th className="w-8">#</th><th>Indikator KPI</th><th className="w-32">Target</th><th className="w-36">Nilai Aktual</th><th className="w-24 text-center">Pra-skor</th><th>Catatan</th></tr></thead>
                  <tbody>
                    {dim.indicators.map(kpi => {
                      const entry = entries[kpi.id] || {};
                      const hasValue = entry.actual_value !== '' && entry.actual_value !== undefined;
                      const liveScore = previewNorm(kpi, entry.actual_value);
                      const livecat = getCategoryConfig(liveScore);
                      return (
                        <tr key={kpi.id}>
                          <td className="text-xs font-bold text-slate-400">{kpi.kpi_number}</td>
                          <td><p className="text-xs font-semibold text-slate-800">{kpi.name}</p><p className="text-[10px] text-slate-400">{kpi.unit} · {kpi.normalization_type}</p></td>
                          <td className="text-xs text-slate-600 font-medium">{kpi.target_operator} {kpi.target_value}</td>
                          <td>
                            <input type="number" className={`input text-center py-1.5 font-semibold ${hasValue ? 'border-green-300 bg-green-50/30 focus:ring-green-400' : ''}`}
                              min={kpi.min_value} max={kpi.max_value} step="0.01" placeholder="–" value={entry.actual_value ?? ''}
                              disabled={isPeriodLocked} onChange={e => setEntry(kpi.id, 'actual_value', e.target.value)} />
                          </td>
                          <td className="text-center">
                            {liveScore !== null ? <span className="text-sm font-black" style={{ color: livecat.color }}>{formatScore(liveScore)}</span> : <span className="text-xs text-slate-300">–</span>}
                          </td>
                          <td>
                            <input type="text" className="input py-1.5 text-xs" placeholder="Catatan opsional..." value={entry.notes || ''}
                              disabled={isPeriodLocked} onChange={e => setEntry(kpi.id, 'notes', e.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {loading && selectedEmployee && selectedPeriod && (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2">
          <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />Memuat data KPI...
        </div>
      )}

      {selectedEmployee && selectedPeriod && !loading && !isPeriodLocked && (
        <div className="card p-4 flex items-center justify-between gap-4 flex-wrap sticky bottom-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0" /><span>{overallFilled}/{overallTotal} indikator terisi. Draft: simpan sementara. Submit: kirim & hitung skor DAMAI.</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave('draft')} disabled={saving} className="btn-secondary"><Save className="w-4 h-4" /> Simpan Draft</button>
            <button onClick={() => handleSave('submitted')} disabled={saving || overallFilled === 0} className="btn-primary">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="w-4 h-4" /> Submit KPI</>}
            </button>
          </div>
        </div>
      )}

      {(!selectedEmployee || !selectedPeriod) && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
          <ClipboardList className="w-12 h-12 opacity-20 mb-3" /><p className="text-sm">Pilih pegawai dan periode untuk mulai mengisi data KPI</p>
        </div>
      )}
    </div>
  );
}
