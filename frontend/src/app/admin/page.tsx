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
  Users
} from 'lucide-react';

interface FullStats {
  total_generated: number;
  total_visits: number;
  total_gano_visits: number;
  total_gano_scenarios: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminDashboard() {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          total_generated: data.total_generated || 0,
          total_visits: data.total_visits || 0,
          total_gano_visits: data.total_gano_visits || 0,
          total_gano_scenarios: data.total_gano_scenarios || 0,
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  // Conversion calculations
  const genConversion = stats && stats.total_visits > 0
    ? ((stats.total_generated / stats.total_visits) * 100).toFixed(1)
    : '0';

  const ganoVisitRate = stats && stats.total_visits > 0
    ? ((stats.total_gano_visits / stats.total_visits) * 100).toFixed(1)
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
              <span>{autoRefresh ? 'Otomatik Yenileme (5s) Açık' : 'Otomatik Yenilemeyi Aç'}</span>
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

        {/* --- Primary Metrics Cards Grid --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

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
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <CheckCircle2 size={12} className="text-[#e7a240]" />
              <span>PDF yüklenip çizelge üretilme sayısı</span>
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
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <PieChart size={12} className="text-indigo-400" />
              <span>/gano sayfasını açan kullanıcı sayısı</span>
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
            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <TrendingUp size={12} className="text-emerald-400" />
              <span>AGNO için yüklenen transkript/program</span>
            </div>
          </div>

        </div>

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
                Ziyaretçilerin %{ganoVisitRate}'i AGNO Hesaplama modülüne geçiş yaptı.
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
