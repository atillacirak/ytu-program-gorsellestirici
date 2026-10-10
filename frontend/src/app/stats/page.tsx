'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Calendar,
  Calculator,
  FileText,
  RefreshCw,
  TrendingUp,
  Activity,
  ArrowLeft,
  CheckCircle2,
  PieChart,
  ShieldAlert,
  Users,
  CalendarDays
} from 'lucide-react';

interface FullStats {
  total_generated: number;
  total_visits: number;
  total_gano_visits: number;
  total_gano_scenarios: number;
  total_generated_pdf?: number;
  total_generated_prep?: number;
  total_devamsizlik_visits?: number;
  pct_generated?: number;
  pct_visits?: number;
  pct_gano_visits?: number;
  pct_gano_scenarios?: number;
  pct_devamsizlik_visits?: number;
  chart_data?: { label: string; visits: number }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AGNO_LAUNCH_BASELINE_VISITS = 3450;

const renderPct = (pct?: number, period?: string) => {
  if (period === 'all') {
    return (
      <div className="text-xs sm:text-[13px] text-slate-500 mt-2 font-medium">
        Tüm zamanlar toplamı
      </div>
    );
  }
  if (pct === undefined) return null;
  const isUp = pct > 0;
  const isZero = pct === 0;
  return (
    <div className={`flex items-center gap-1.5 text-xs sm:text-[13px] font-bold mt-2 ${isZero ? 'text-slate-400' : isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
      {!isZero ? (
        <TrendingUp size={14} className={isUp ? '' : 'rotate-180'} />
      ) : (
        <span className="text-slate-500 font-normal select-none">—</span>
      )}
      <span>{isZero ? 'Değişim yok (%0)' : `${isUp ? '+' : ''}${pct}% (önceki döneme kıyasla)`}</span>
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stats?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const hasData = (data.chart_data && data.chart_data.length > 0) || data.total_visits > 0;

        if (!hasData && isLocal) {
          // Localhost mock veri üretimi (Test için)
          const mockChart = period === '24h'
            ? Array.from({ length: 24 }).map((_, i) => ({
                label: `${(i + 2) % 24}:00`,
                visits: [0, 1, 0, 3, 6, 2, 8, 4, 12, 18, 25, 42, 38, 21, 15, 9, 4, 2, 1, 0, 0, 1, 3, 5][i]
              }))
            : period === '7d'
            ? ['10-04', '10-05', '10-06', '10-07', '10-08', '10-09', '10-10'].map((d, i) => ({
                label: d,
                visits: [85, 120, 94, 145, 182, 160, 210][i]
              }))
            : [35, 42, 28, 55, 63, 48, 72, 80, 65, 50, 45, 60, 75, 88, 92, 70, 64, 58, 82, 95, 110, 85, 78, 90, 105, 115, 98, 120, 135, 142].map((visits, i) => ({
                label: `Gün ${i + 1}`,
                visits
              }));

          setStats({
            total_generated: 142,
            total_visits: 580,
            total_gano_visits: 89,
            total_gano_scenarios: 45,
            total_generated_pdf: 95,
            total_generated_prep: 47,
            total_devamsizlik_visits: 111,
            pct_generated: 24.5,
            pct_visits: 18.2,
            pct_gano_visits: 42.0,
            pct_gano_scenarios: 15.8,
            pct_devamsizlik_visits: 28.5,
            chart_data: mockChart,
          });
        } else {
          setStats({
            total_generated: data.total_generated || 0,
            total_visits: data.total_visits || 0,
            total_gano_visits: data.total_gano_visits || 0,
            total_gano_scenarios: data.total_gano_scenarios || 0,
            total_generated_pdf: data.total_generated_pdf ?? 0,
            total_generated_prep: data.total_generated_prep ?? 0,
            total_devamsizlik_visits: data.total_devamsizlik_visits || 0,
            pct_generated: data.pct_generated,
            pct_visits: data.pct_visits,
            pct_gano_visits: data.pct_gano_visits,
            pct_gano_scenarios: data.pct_gano_scenarios,
            pct_devamsizlik_visits: data.pct_devamsizlik_visits,
            chart_data: data.chart_data,
          });
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Localhost fallback on fetch error
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        const mockChart = Array.from({ length: 24 }).map((_, i) => ({
          label: `${i}:00`,
          visits: [0, 1, 0, 2, 5, 1, 7, 3, 11, 15, 22, 35, 49, 18, 12, 7, 3, 2, 1, 0, 0, 1, 2, 4][i]
        }));
        setStats({
          total_generated: 142,
          total_visits: 580,
          total_gano_visits: 89,
          total_gano_scenarios: 45,
          total_generated_pdf: 95,
          total_generated_prep: 47,
          total_devamsizlik_visits: 111,
          pct_generated: 24.5,
          pct_visits: 18.2,
          pct_gano_visits: 42.0,
          pct_gano_scenarios: 15.8,
          pct_devamsizlik_visits: 28.5,
          chart_data: mockChart,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  // Conversion calculations
  const genConversion = stats && stats.total_visits > 0
    ? ((stats.total_generated / stats.total_visits) * 100).toFixed(1)
    : '0';

  // AGNO Interest Rate (For 'all' time, baseline starts at 3450 so 3500+ visits count fairly for new AGNO feature)
  const effectiveVisitsForAgno = period === 'all'
    ? Math.max(1, (stats?.total_visits || 0) - AGNO_LAUNCH_BASELINE_VISITS)
    : (stats?.total_visits || 1);

  const ganoVisitRate = stats && effectiveVisitsForAgno > 0
    ? Math.min(100, (stats.total_gano_visits / effectiveVisitsForAgno) * 100).toFixed(1)
    : '0';

  const ganoScenarioRate = stats && stats.total_gano_visits > 0
    ? ((stats.total_gano_scenarios / stats.total_gano_visits) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* --- Top Navigation Header --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Ana Sayfaya Dön"
            >
              <ArrowLeft size={18} />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#e7a240]/20 text-[#e7a240] border border-[#e7a240]/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Dev Panel
                </span>
                <span className="text-xs text-slate-400 font-mono">v2.0 Live Stats</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                YTÜ Dostun · Canlı İstatistik Analiz Paneli
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-all flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Activity size={14} />
              <span>{autoRefresh ? 'Otomatik Yenileme (30s) Açık' : 'Otomatik Yenilemeyi Aç'}</span>
            </button>

            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 border border-blue-500/30 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Yenile</span>
            </button>
          </div>
        </div>

        {/* --- Period Filter Bar --- */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold px-1">
            <Calendar size={16} className="text-indigo-400" />
            <span>Zaman Aralığı Filtresi:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setPeriod('24h')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === '24h'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Son 24 Saat
            </button>
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === '7d'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Son 7 Gün
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === '30d'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Son 30 Gün
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Tüm Zamanlar
            </button>
          </div>
        </div>

        {/* --- Primary Metrics Cards Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">

          {/* 1. Total Visits */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Toplam Ziyaretçi
              </span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Eye size={18} />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats ? stats.total_visits.toLocaleString() : '...'}
            </div>
            {renderPct(stats?.pct_visits, period)}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <Users size={12} className="text-blue-400" />
              <span>Siteye giriş yapan kullanıcı sayısı</span>
            </div>
          </div>

          {/* 2. Total Generated Schedules */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg group hover:border-[#e7a240]/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ders Programı Oluşturuldu
              </span>
              <div className="p-2.5 rounded-xl bg-[#e7a240]/10 text-[#e7a240] border border-[#e7a240]/20">
                <Calendar size={18} />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats ? stats.total_generated.toLocaleString() : '...'}
            </div>
            {renderPct(stats?.pct_generated, period)}
            {stats && (
              <div className="flex items-center justify-between text-xs font-mono bg-slate-900/70 rounded-xl px-3 py-2 border border-slate-700/60 shadow-inner">
                <span className="flex items-center gap-1.5 text-blue-300">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  PDF: <strong className="text-white text-xs sm:text-sm">{(stats.total_generated_pdf || 0).toLocaleString()}</strong>
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Hazırlık: <strong className="text-white text-xs sm:text-sm">{(stats.total_generated_prep || 0).toLocaleString()}</strong>
                </span>
              </div>
            )}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <CheckCircle2 size={12} className="text-[#e7a240]" />
              <span>PDF yükleme ve hazırlık sınıfı üretimleri</span>
            </div>
          </div>

          {/* 3. Devamsızlık Modülü Ziyareti */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg group hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Devamsızlık Takibi
              </span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CalendarDays size={18} />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats ? (stats.total_devamsizlik_visits ?? 0).toLocaleString() : '...'}
            </div>
            {renderPct(stats?.pct_devamsizlik_visits, period)}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <CalendarDays size={12} className="text-purple-400" />
              <span>/devamsizlik sayfasını açan kullanıcı sayısı</span>
            </div>
          </div>

          {/* 3. GANO Visits */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                AGNO Sayfası Ziyareti
              </span>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calculator size={18} />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats ? stats.total_gano_visits.toLocaleString() : '...'}
            </div>
            {renderPct(stats?.pct_gano_visits, period)}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <PieChart size={12} className="text-indigo-400" />
              <span>/agno sayfasını açan kullanıcı sayısı</span>
            </div>
          </div>

          {/* 4. GANO Scenarios Created / Documents Uploaded */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                AGNO Senaryo / Belge
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText size={18} />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats ? stats.total_gano_scenarios.toLocaleString() : '...'}
            </div>
            {renderPct(stats?.pct_gano_scenarios, period)}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <TrendingUp size={12} className="text-emerald-400" />
              <span>AGNO için yüklenen transkript/program</span>
            </div>
          </div>

        </div>

        
        {/* --- Activity Chart --- */}
        {period !== 'all' && stats?.chart_data && stats.chart_data.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 mb-4">
              <Activity size={20} className="text-[#e7a240]" />
              <h2 className="text-base font-bold text-white">
                Ziyaretçi Aktivite Grafiği (Son {period})
              </h2>
            </div>
            
            <div className="h-56 w-full flex items-end gap-1 sm:gap-1.5 overflow-x-auto hide-scrollbar pt-6 pb-2">
              {(() => {
                const maxVal = Math.max(...stats.chart_data.map(d => d.visits), 1);
                return stats.chart_data.map((d, i) => {
                  const pctHeight = Math.max(Math.round((d.visits / maxVal) * 100), d.visits > 0 ? 6 : 2);
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 min-w-[12px] sm:min-w-[18px] h-full justify-end">
                      <div className="w-full flex-1 flex flex-col justify-end items-center">
                        {/* Sayı: Çubuğun tam ucunun üstünde belirgin ve büyük */}
                        <span className={`text-xs sm:text-sm font-mono font-black leading-none mb-1 select-none transition-all ${
                          d.visits > 0 ? 'text-indigo-100 drop-shadow-sm' : 'text-transparent'
                        }`}>
                          {d.visits > 0 ? d.visits : ''}
                        </span>

                        {/* Bar */}
                        <div 
                          className={`w-full max-w-[20px] rounded-t-sm transition-all duration-300 ${
                            d.visits > 0
                              ? 'bg-gradient-to-t from-blue-600 to-indigo-400 hover:from-blue-500 hover:to-indigo-300 shadow-sm'
                              : 'bg-slate-700/30'
                          }`}
                          style={{ height: `${pctHeight}%`, minHeight: '3px' }}
                          title={`${d.label}: ${d.visits} ziyaret`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-300 font-semibold mt-2 font-mono whitespace-nowrap truncate max-w-full text-center">
                        {d.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* --- Conversion Rates & Analytical Breakdown --- */}
        <div className="bg-slate-800/60 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={20} className="text-[#e7a240]" />
              <h2 className="text-base font-bold text-white">
                Dönüşüm Oranları & Kullanıcı Etkileşim Analizi
              </h2>
            </div>
            {lastUpdated && (
              <span className="text-[11px] font-mono text-slate-400">
                Son Güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Metric 1 */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Program Oluşturma Oranı</span>
                <span className="font-mono font-bold text-blue-400">%{genConversion}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, parseFloat(genConversion))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Siteye girenlerin %{genConversion}'i resmi PDF belgesi yükleyip ders programı oluşturdu.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">AGNO Sayfası İlgisi</span>
                <span className="font-mono font-bold text-indigo-400">%{ganoVisitRate}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, parseFloat(ganoVisitRate))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {period === 'all'
                  ? `Yeni ziyaretçilerin %${ganoVisitRate}'i AGNO modülüne geçti (3.450+ lansman sonrası ziyaretler).`
                  : `Seçilen dönemdeki ziyaretçilerin %${ganoVisitRate}'i AGNO modülüne geçti.`}
              </p>
            </div>

            {/* Metric 3 */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">AGNO Belge Yükleme Başarısı</span>
                <span className="font-mono font-bold text-emerald-400">%{ganoScenarioRate}</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, parseFloat(ganoScenarioRate))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                AGNO sayfasına girenlerin %{ganoScenarioRate}'i belge yükleyerek senaryo oluşturdu.
              </p>
            </div>

          </div>
        </div>

        {/* --- System Status & Info Footer --- */}
        <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-[#e7a240]" />
            <span>Veriler Upstash Redis üzerinde güvenli, gerçek zamanlı ve anlık sayaçlar olarak tutulmaktadır.</span>
          </div>
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2"
          >
            ← Ana Sayfaya Dön
          </a>
        </div>

      </div>
    </div>
  );
}
