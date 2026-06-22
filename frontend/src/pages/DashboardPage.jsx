import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { getCategoryConfig, formatScore, getRecommendation } from '../utils/helpers';
import GaugeChart from '../components/Charts/GaugeChart';
import DimRadarChart from '../components/Charts/DimRadarChart';
import StatCard from '../components/UI/StatCard';
import ScoreBadge from '../components/UI/ScoreBadge';
import PageHeader from '../components/UI/PageHeader';
import ScopeBanner from '../components/UI/ScopeBanner';
import { CardSkeleton } from '../components/UI/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { Users, Award, TrendingUp, AlertTriangle, Target, BarChart3, RefreshCw, Info } from 'lucide-react';

const DIM_COLORS = ['#1e3a5f', '#7c3aed', '#0891b2', '#16a34a', '#ea580c'];
const CAT_COLORS = { 'Sangat Baik': '#22c55e', 'Baik': '#3b82f6', 'Cukup': '#eab308', 'Kurang': '#f97316', 'Perlu Perhatian': '#ef4444' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [byUnit, setByUnit] = useState([]);
  const [byFaculty, setByFaculty] = useState([]);
  const [scores, setScores] = useState([]);
  const [myScore, setMyScore] = useState(null);
  const [myEntries, setMyEntries] = useState([]);
  const [percentile, setPercentile] = useState(null);
  const [period, setPeriod] = useState(null);
  const [scopeLabel, setScopeLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodsRes = await api.get('/periods');
      const allPeriods = periodsRes.data.data || [];
      const activePeriod = allPeriods.find(p => p.status === 'active');
      const completedPeriod = allPeriods.find(p => p.status === 'completed');
      const displayPeriod = activePeriod || completedPeriod;
      setPeriod(displayPeriod);

      if (!displayPeriod) { setLoading(false); return; }

      const [summaryRes, scoresRes] = await Promise.all([
        api.get(`/kpi/scores/summary?period_id=${displayPeriod.id}`),
        api.get(`/kpi/scores?period_id=${displayPeriod.id}`),
      ]);

      setSummary(summaryRes.data.data?.summary || null);
      setByUnit(summaryRes.data.data?.byUnit || []);
      setByFaculty(summaryRes.data.data?.byFaculty || []);
      setScores(scoresRes.data.data || []);
      setScopeLabel(summaryRes.data.scope_label || scoresRes.data.scope_label || '');

      if (user.role === 'dosen_tendik' && user.employee_id) {
        try {
          const [myRes, entriesRes, percRes] = await Promise.all([
            api.get(`/kpi/scores?employee_id=${user.employee_id}&period_id=${displayPeriod.id}`),
            api.get(`/kpi/entries?employee_id=${user.employee_id}&period_id=${displayPeriod.id}`),
            api.get(`/kpi/scores/percentile?employee_id=${user.employee_id}&period_id=${displayPeriod.id}`),
          ]);
          if (myRes.data.data?.length > 0) setMyScore(myRes.data.data[0]);
          setMyEntries(entriesRes.data.data || []);
          setPercentile(percRes.data.data);
        } catch {}
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const pieData = summary ? [
    { name: 'Sangat Baik', value: summary.count_sangat_baik || 0 },
    { name: 'Baik', value: summary.count_baik || 0 },
    { name: 'Cukup', value: summary.count_cukup || 0 },
    { name: 'Kurang', value: summary.count_kurang || 0 },
    { name: 'Perlu Perhatian', value: summary.count_perlu_perhatian || 0 },
  ].filter(d => d.value > 0) : [];

  const atRisk = scores.filter(s => s.total_score && s.total_score < 70).slice(0, 8);
  const topPerformers = [...scores].sort((a, b) => (b.total_score || 0) - (a.total_score || 0)).slice(0, 5);

  // Determine comparison data: byUnit (yayasan/admin) vs byFaculty (pimpinan/manajer_unit)
  const isMultiUnit = ['yayasan', 'admin'].includes(user.role);
  const compareData = isMultiUnit ? byUnit : byFaculty;
  const compareTitle = isMultiUnit ? 'Perbandingan Antar Unit Yayasan' : 'Perbandingan per Fakultas/Divisi';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 skeleton w-64 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <CardSkeleton key={i} height="h-64" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-orange-400 mb-4" />
        <p className="text-lg font-semibold text-slate-700 mb-2">{error}</p>
        <button onClick={loadDashboard} className="btn-primary mt-4"><RefreshCw className="w-4 h-4" /> Coba Lagi</button>
      </div>
    );
  }

  // ── INDIVIDUAL DASHBOARD (dosen_tendik) ──────────────────────
  if (user.role === 'dosen_tendik') {
    const catConf = getCategoryConfig(myScore?.total_score);
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Dashboard Saya" subtitle={`Selamat datang, ${user.employee_name || user.username} · ${period?.name || '–'}`}
          icon={Award} actions={<button onClick={loadDashboard} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>} />

        <ScopeBanner label={scopeLabel} />

        {percentile && (
          <div className="card p-4 flex items-center gap-4 border-l-4" style={{ borderColor: catConf.color }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0" style={{ background: catConf.color }}>
              #{percentile.rank}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Peringkat Anda: #{percentile.rank} dari {percentile.total} pegawai (dalam fakultas/divisi yang sama)</p>
              <p className="text-xs text-slate-500 mt-0.5">Lebih baik dari {percentile.percentile}% rekan — {catConf.name}</p>
            </div>
            <ScoreBadge score={myScore?.total_score} size="lg" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 self-start">Skor DAMAI Saya</p>
            <GaugeChart score={myScore?.total_score} size={200} />
            {myScore ? <p className="text-xs text-slate-400 mt-3 text-center">{myScore.period_name}</p>
              : <p className="text-sm text-slate-400 mt-4 text-center">Belum ada data penilaian untuk periode ini</p>}
          </div>

          <div className="card p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">5 Dimensi DAMAI</p>
            {myScore ? <DimRadarChart score={myScore} /> : <div className="h-60 flex items-center justify-center text-sm text-slate-400">Belum ada data penilaian</div>}
          </div>

          <div className="card p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Detail Dimensi</p>
            {myScore ? (
              <div className="space-y-4">
                {[
                  { label: 'Disiplin', value: myScore.score_disiplin, weight: '20%' },
                  { label: 'Amanah', value: myScore.score_amanah, weight: '25%' },
                  { label: 'Melayani', value: myScore.score_melayani, weight: '25%' },
                  { label: 'Adaptif', value: myScore.score_adaptif, weight: '15%' },
                  { label: 'Inovatif', value: myScore.score_inovatif, weight: '15%' },
                ].map(d => {
                  const cat = getCategoryConfig(d.value);
                  return (
                    <div key={d.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">{d.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{d.weight}</span>
                          <span className="text-sm font-black" style={{ color: cat.color }}>{formatScore(d.value)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value || 0}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-8">Belum ada data</p>}
          </div>
        </div>

        {myScore && (
          <div className="card p-5" style={{ borderLeft: `4px solid ${catConf.color}` }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${catConf.color}20` }}>
                <Target className="w-4 h-4" style={{ color: catConf.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 mb-1">{catConf.icon} Rekomendasi Tindak Lanjut</p>
                <p className="text-sm text-slate-600 leading-relaxed">{getRecommendation(myScore.total_score)}</p>
              </div>
            </div>
          </div>
        )}

        {myEntries.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Detail KPI</p>
              <span className="text-xs text-slate-400">{myEntries.length} indikator</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Dimensi</th><th>Indikator KPI</th><th className="text-right">Target</th><th className="text-right">Aktual</th><th className="text-right">Skor</th></tr></thead>
                <tbody>
                  {myEntries.map(e => {
                    const cat = getCategoryConfig(e.normalized_score);
                    return (
                      <tr key={e.id}>
                        <td><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">{e.dimension_code}</span></td>
                        <td><p className="text-xs font-semibold text-slate-800">{e.kpi_name}</p><p className="text-[10px] text-slate-400">{e.unit}</p></td>
                        <td className="text-xs text-right text-slate-500">{e.target_operator} {e.target_value}</td>
                        <td className="text-xs text-right font-semibold text-slate-700">{e.actual_value ?? '–'}</td>
                        <td className="text-right"><span className="text-sm font-black" style={{ color: cat.color }}>{formatScore(e.normalized_score)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── AGGREGATE DASHBOARD (yayasan/admin/pimpinan/manajer_unit) ─
  const titleMap = { yayasan: 'Dashboard Yayasan', pimpinan: 'Dashboard Pimpinan Unit', manajer_unit: 'Dashboard Unit', admin: 'Dashboard Administrator' };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={titleMap[user.role] || 'Dashboard'} subtitle={`Periode: ${period?.name || 'Belum ada periode aktif'}`}
        icon={BarChart3} actions={<button onClick={loadDashboard} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Refresh</button>} />

      <ScopeBanner label={scopeLabel} count={summary?.total_assessed} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Civitas Dinilai" value={summary?.total_assessed || 0} subtitle="Dosen & Tendik" icon={Users} color="blue" />
        <StatCard title="Rata-rata DAMAI" value={summary?.avg_score ? formatScore(summary.avg_score) : '–'}
          subtitle={summary ? `Min ${formatScore(summary.min_score)} · Maks ${formatScore(summary.max_score)}` : '–'} icon={Award} color="primary" />
        <StatCard title="Sangat Baik & Baik" value={(summary?.count_sangat_baik || 0) + (summary?.count_baik || 0)} subtitle="Performa optimal" icon={TrendingUp} color="green" />
        <StatCard title="Perlu Perhatian" value={(summary?.count_kurang || 0) + (summary?.count_perlu_perhatian || 0)} subtitle="Butuh tindak lanjut" icon={AlertTriangle} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 self-start">Skor DAMAI {isMultiUnit ? 'Yayasan' : 'Unit'}</p>
          <GaugeChart score={summary?.avg_score} size={190} />
          <div className="w-full mt-5 space-y-2.5">
            {[
              { label: 'Disiplin (20%)', val: summary?.avg_disiplin },
              { label: 'Amanah (25%)', val: summary?.avg_amanah },
              { label: 'Melayani (25%)', val: summary?.avg_melayani },
              { label: 'Adaptif (15%)', val: summary?.avg_adaptif },
              { label: 'Inovatif (15%)', val: summary?.avg_inovatif },
            ].map((d, i) => {
              const cat = getCategoryConfig(d.val);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DIM_COLORS[i] }} />
                  <span className="text-slate-600 flex-1">{d.label}</span>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.val || 0}%`, background: cat.color }} />
                  </div>
                  <span className="font-bold text-slate-800 w-10 text-right">{formatScore(d.val)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{compareTitle}</p>
          {compareData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={compareData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey={isMultiUnit ? 'code' : 'code'} tick={{ fontSize: 11, fontFamily: 'Sora' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'Sora' }} />
                <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Tooltip contentStyle={{ fontFamily: 'Sora', fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [Number(v).toFixed(2), 'Rata-rata Skor']} />
                <Bar dataKey="avg_score" radius={[4, 4, 0, 0]}>
                  {compareData.map((_, i) => <Cell key={i} fill={DIM_COLORS[i % DIM_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-sm text-slate-400 gap-2">
              <Info className="w-8 h-8 opacity-30" />Belum cukup data
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Distribusi Kategori Pencapaian</p>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <PieChart width={160} height={160}>
                <Pie data={pieData} cx={75} cy={75} innerRadius={42} outerRadius={72} dataKey="value" strokeWidth={2} stroke="#fff">
                  {pieData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Sora', fontSize: 11, borderRadius: 8 }} />
              </PieChart>
              <div className="flex-1 space-y-2">
                {summary && [
                  { label: 'Sangat Baik', val: summary.count_sangat_baik, color: '#22c55e' },
                  { label: 'Baik', val: summary.count_baik, color: '#3b82f6' },
                  { label: 'Cukup', val: summary.count_cukup, color: '#eab308' },
                  { label: 'Kurang', val: summary.count_kurang, color: '#f97316' },
                  { label: 'Perlu Perhatian', val: summary.count_perlu_perhatian, color: '#ef4444' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-slate-600 flex-1">{c.label}</span>
                    <span className="font-bold text-slate-800 w-6 text-right">{c.val || 0}</span>
                    {summary.total_assessed > 0 && (
                      <span className="text-slate-400 text-[10px] w-10 text-right">{Math.round(((c.val || 0) / summary.total_assessed) * 100)}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="h-40 flex items-center justify-center text-sm text-slate-400">Belum ada data</div>}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /><p className="text-sm font-bold text-slate-800">Top 5 Performer</p>
          </div>
          <table className="table">
            <thead><tr><th>#</th><th>Nama</th><th>Unit</th><th className="text-right">Skor</th></tr></thead>
            <tbody>
              {topPerformers.map((s, i) => (
                <tr key={s.id}>
                  <td className="font-black text-sm" style={{ color: ['#f59e0b', '#94a3b8', '#cd7c2d'][i] || '#cbd5e1' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </td>
                  <td><p className="text-xs font-semibold text-slate-800">{s.employee_name}</p><p className="text-[10px] text-slate-400">{s.rank || s.position}</p></td>
                  <td className="text-xs text-slate-500">{s.faculty_code}</td>
                  <td className="text-right"><ScoreBadge score={s.total_score} /></td>
                </tr>
              ))}
              {topPerformers.length === 0 && <tr><td colSpan={4} className="text-center text-xs text-slate-400 py-8">Belum ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /><p className="text-sm font-bold text-slate-800">Memerlukan Perhatian</p>
            <span className="ml-auto text-xs text-slate-400">Skor &lt;70</span>
          </div>
          <table className="table">
            <thead><tr><th>Nama</th><th>Unit</th><th className="text-right">Skor</th></tr></thead>
            <tbody>
              {atRisk.map(s => (
                <tr key={s.id}>
                  <td><p className="text-xs font-semibold text-slate-800">{s.employee_name}</p><p className="text-[10px] text-slate-400">{s.rank || s.position}</p></td>
                  <td className="text-xs text-slate-500">{s.faculty_code}</td>
                  <td className="text-right"><ScoreBadge score={s.total_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
