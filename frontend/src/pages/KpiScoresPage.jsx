import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/UI/PageHeader';
import ScopeBanner from '../components/UI/ScopeBanner';
import { TableSkeleton } from '../components/UI/Skeleton';
import { formatScore, getCategoryConfig } from '../utils/helpers';
import { BarChart3, Search, RefreshCw, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

const DIM_COLORS_LIST = ['#1e3a5f', '#7c3aed', '#0891b2', '#16a34a', '#ea580c'];

export default function KpiScoresPage() {
  const [scores, setScores] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [computing, setComputing] = useState(false);
  const [sortKey, setSortKey] = useState('total_score');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [scopeLabel, setScopeLabel] = useState('');

  useEffect(() => {
    api.get('/periods').then(p => {
      setPeriods(p.data.data || []);
      const active = p.data.data?.find(pd => pd.status === 'completed' || pd.status === 'active');
      if (active) setSelectedPeriod(String(active.id));
    });
  }, []);

  useEffect(() => { if (selectedPeriod) loadScores(); }, [selectedPeriod]);

  async function loadScores() {
    setLoading(true);
    try {
      const res = await api.get(`/kpi/scores?period_id=${selectedPeriod}`);
      setScores(res.data.data || []);
      setScopeLabel(res.data.scope_label || '');
    } catch { toast.error('Gagal memuat data skor'); }
    finally { setLoading(false); }
  }

  async function handleCompute() {
    if (!selectedPeriod) return;
    setComputing(true);
    try {
      await api.post('/kpi/scores/compute', { period_id: parseInt(selectedPeriod) });
      toast.success('Skor DAMAI berhasil dihitung ulang');
      loadScores();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menghitung skor'); }
    finally { setComputing(false); }
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function exportCsv() {
    const headers = ['No', 'Nama', 'NIP/NIDN', 'Jabatan', 'Tipe', 'Unit', 'Fakultas/Divisi', 'Disiplin', 'Amanah', 'Melayani', 'Adaptif', 'Inovatif', 'Total DAMAI', 'Kategori'];
    const rows = filtered.map((s, i) => [
      i + 1, s.employee_name, s.nip_nidn, s.position, s.employee_type, s.org_unit_code, s.faculty_code,
      s.score_disiplin, s.score_amanah, s.score_melayani, s.score_adaptif, s.score_inovatif, s.total_score, s.category,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `skor-damai-periode-${selectedPeriod}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Data berhasil diekspor');
  }

  let filtered = scores.filter(s => {
    const matchSearch = !search || s.employee_name?.toLowerCase().includes(search.toLowerCase()) || s.nip_nidn?.includes(search);
    const matchType = !filterType || s.employee_type === filterType;
    const matchCat = !filterCategory || s.category === filterCategory;
    return matchSearch && matchType && matchCat;
  });
  filtered = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? -1, vb = b[sortKey] ?? -1;
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const dimCols = [
    { key: 'score_disiplin', label: 'D', full: 'Disiplin', color: '#1e3a5f' },
    { key: 'score_amanah', label: 'A', full: 'Amanah', color: '#7c3aed' },
    { key: 'score_melayani', label: 'M', full: 'Melayani', color: '#0891b2' },
    { key: 'score_adaptif', label: 'Ad', full: 'Adaptif', color: '#16a34a' },
    { key: 'score_inovatif', label: 'I', full: 'Inovatif', color: '#ea580c' },
  ];

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary-600" /> : <ChevronDown className="w-3 h-3 text-primary-600" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Skor DAMAI" subtitle="Rekap hasil penilaian kinerja civitas akademika" icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <button onClick={exportCsv} disabled={filtered.length === 0} className="btn-secondary"><Download className="w-4 h-4" /> Ekspor CSV</button>
            <button onClick={handleCompute} disabled={computing || !selectedPeriod} className="btn-secondary">
              <RefreshCw className={`w-4 h-4 ${computing ? 'animate-spin' : ''}`} />{computing ? 'Menghitung...' : 'Hitung Ulang'}
            </button>
          </div>
        } />

      <ScopeBanner label={scopeLabel} count={filtered.length} total={scores.length} />

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label mb-1">Periode</label>
            <select className="input w-52" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label mb-1">Tipe</label>
            <select className="input w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Semua</option><option value="dosen">Dosen</option><option value="tendik">Tendik</option>
            </select>
          </div>
          <div>
            <label className="label mb-1">Kategori</label>
            <select className="input w-40" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Semua</option>
              {['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Perlu Perhatian'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-44">
            <label className="label mb-1">Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="input pl-9" placeholder="Nama atau NIP/NIDN..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {scores.length > 0 && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Sangat Baik', color: '#22c55e', count: scores.filter(s => (s.total_score || 0) >= 90).length },
            { label: 'Baik', color: '#3b82f6', count: scores.filter(s => (s.total_score || 0) >= 80 && (s.total_score || 0) < 90).length },
            { label: 'Cukup', color: '#eab308', count: scores.filter(s => (s.total_score || 0) >= 70 && (s.total_score || 0) < 80).length },
            { label: 'Kurang', color: '#f97316', count: scores.filter(s => (s.total_score || 0) >= 60 && (s.total_score || 0) < 70).length },
            { label: 'Perlu Perhatian', color: '#ef4444', count: scores.filter(s => (s.total_score || 0) < 60).length },
          ].map(c => (
            <div key={c.label} className="card p-3 flex items-center gap-3 cursor-pointer transition-all"
              onClick={() => setFilterCategory(prev => prev === c.label ? '' : c.label)}>
              <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ background: c.color }} />
              <div><p className="text-[10px] text-slate-500 leading-tight">{c.label}</p><p className="text-2xl font-black text-slate-800">{c.count}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-8">#</th><th>Nama</th><th>Tipe / Unit</th>
                  {dimCols.map(d => (
                    <th key={d.key} className="text-center cursor-pointer hover:bg-slate-100 select-none" title={d.full} onClick={() => handleSort(d.key)}>
                      <div className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.label} <SortIcon col={d.key} /></div>
                    </th>
                  ))}
                  <th className="text-center cursor-pointer hover:bg-slate-100 select-none" onClick={() => handleSort('total_score')}>
                    <div className="flex items-center justify-center gap-1">Total DAMAI <SortIcon col="total_score" /></div>
                  </th>
                  <th className="text-center">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const cat = getCategoryConfig(s.total_score);
                  const isExpanded = expandedRow === s.id;
                  const radarData = [
                    { dim: 'Disiplin', val: s.score_disiplin || 0 }, { dim: 'Amanah', val: s.score_amanah || 0 },
                    { dim: 'Melayani', val: s.score_melayani || 0 }, { dim: 'Adaptif', val: s.score_adaptif || 0 }, { dim: 'Inovatif', val: s.score_inovatif || 0 },
                  ];
                  return (
                    <React.Fragment key={s.id}>
                      <tr className="cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : s.id)}>
                        <td className="text-xs text-slate-400 font-bold">{i + 1}</td>
                        <td><p className="text-sm font-semibold text-slate-800">{s.employee_name}</p><p className="text-[10px] text-slate-400">{s.nip_nidn}</p></td>
                        <td>
                          <p className="text-xs text-slate-600 capitalize">{s.employee_type}</p>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded-full">{s.org_unit_code}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s.faculty_code}</span>
                          </div>
                        </td>
                        {dimCols.map(d => <td key={d.key} className="text-center"><span className="text-xs font-bold" style={{ color: d.color }}>{formatScore(s[d.key])}</span></td>)}
                        <td className="text-center"><span className="text-base font-black" style={{ color: cat.color }}>{formatScore(s.total_score)}</span></td>
                        <td className="text-center"><span className={`badge ${cat.badge}`}>{cat.name}</span></td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-8 flex-wrap">
                              <ResponsiveContainer width={200} height={160}>
                                <RadarChart data={radarData}>
                                  <PolarGrid stroke="#e2e8f0" />
                                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fontFamily: 'Sora' }} />
                                  <Radar dataKey="val" stroke={cat.color} fill={cat.color} fillOpacity={0.25} strokeWidth={2} />
                                  <Tooltip contentStyle={{ fontFamily: 'Sora', fontSize: 11, borderRadius: 8 }} />
                                </RadarChart>
                              </ResponsiveContainer>
                              <div className="flex-1 grid grid-cols-5 gap-3">
                                {radarData.map((d, di) => {
                                  const dc = getCategoryConfig(d.val);
                                  return (
                                    <div key={d.dim} className="text-center">
                                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-1 text-white text-xs font-black" style={{ background: DIM_COLORS_LIST[di] }}>
                                        {d.dim.slice(0, 2)}
                                      </div>
                                      <p className="text-[10px] text-slate-500">{d.dim}</p>
                                      <p className="text-sm font-black" style={{ color: dc.color }}>{formatScore(d.val)}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={10} className="text-center text-sm text-slate-400 py-12">Tidak ada data skor untuk filter ini</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Keterangan Dimensi & Formula</p>
        <div className="flex flex-wrap gap-4 mb-2">
          {dimCols.map(d => (
            <div key={d.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-slate-600"><strong>{d.label}</strong> = {d.full}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 font-mono">Skor DAMAI = D×20% + A×25% + M×25% + Ad×15% + I×15%</p>
      </div>
    </div>
  );
}
