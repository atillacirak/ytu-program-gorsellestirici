import re

file_path = 'frontend/src/app/stats/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update FullStats
full_stats_old = """interface FullStats {
  total_generated: number;
  total_visits: number;
  total_gano_visits: number;
  total_gano_scenarios: number;
}"""
full_stats_new = """interface FullStats {
  total_generated: number;
  total_visits: number;
  total_gano_visits: number;
  total_gano_scenarios: number;
  pct_generated?: number;
  pct_visits?: number;
  pct_gano_visits?: number;
  pct_gano_scenarios?: number;
  chart_data?: { label: string; visits: number }[];
}"""
content = content.replace(full_stats_old, full_stats_new)

# 2. Update setStats
set_stats_old = """        setStats({
          total_generated: data.total_generated || 0,
          total_visits: data.total_visits || 0,
          total_gano_visits: data.total_gano_visits || 0,
          total_gano_scenarios: data.total_gano_scenarios || 0,
        });"""
set_stats_new = """        setStats({
          total_generated: data.total_generated || 0,
          total_visits: data.total_visits || 0,
          total_gano_visits: data.total_gano_visits || 0,
          total_gano_scenarios: data.total_gano_scenarios || 0,
          pct_generated: data.pct_generated,
          pct_visits: data.pct_visits,
          pct_gano_visits: data.pct_gano_visits,
          pct_gano_scenarios: data.pct_gano_scenarios,
          chart_data: data.chart_data,
        });"""
content = content.replace(set_stats_old, set_stats_new)

# 3. Add a helper component to render percentages
pct_helper = """
const renderPct = (pct?: number) => {
  if (pct === undefined) return null;
  const isUp = pct > 0;
  const isZero = pct === 0;
  return (
    <div className={`flex items-center gap-1 text-[11px] font-bold mt-2 ${isZero ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
      <TrendingUp size={12} className={isUp && !isZero ? '' : isZero ? 'hidden' : 'rotate-180'} />
      <span>{isUp ? '+' : ''}{pct}% (önceki döneme kıyasla)</span>
    </div>
  );
};
"""
# insert before AdminDashboard component
content = content.replace("export default function AdminDashboard() {", pct_helper + "\nexport default function AdminDashboard() {")

# 4. Insert renderPct into the 4 metric cards
def insert_after(text, search, addition):
    return text.replace(search, search + "\n" + addition)

content = insert_after(content, 
    '<div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">\n              <Eye size={12} className="text-blue-400" />\n              <span>Benzersiz IP veya oturumlar</span>\n            </div>',
    '            {period !== \'all\' && renderPct(stats?.pct_visits)}'
)
content = insert_after(content, 
    '<div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">\n              <CheckCircle2 size={12} className="text-emerald-400" />\n              <span>Başarıyla işlenen PDF sayısı</span>\n            </div>',
    '            {period !== \'all\' && renderPct(stats?.pct_generated)}'
)
content = insert_after(content, 
    '<div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">\n              <Calculator size={12} className="text-indigo-400" />\n              <span>Görüntülenen AGNO sayfası sayısı</span>\n            </div>',
    '            {period !== \'all\' && renderPct(stats?.pct_gano_visits)}'
)
content = insert_after(content, 
    '<div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">\n              <TrendingUp size={12} className="text-emerald-400" />\n              <span>AGNO için yüklenen transkript/program</span>\n            </div>',
    '            {period !== \'all\' && renderPct(stats?.pct_gano_scenarios)}'
)

# wait some symbols might be mis-encoded in python strings?
# Actually the regex in python should use exactly what's in the file.
# Let's write a safer replace.

# 5. Add the Chart UI above the conversion rates
chart_ui = """
        {/* --- Activity Chart --- */}
        {period !== 'all' && stats?.chart_data && stats.chart_data.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 mb-4">
              <Activity size={20} className="text-[#e7a240]" />
              <h2 className="text-base font-bold text-white">
                Ziyaretçi Aktivite Grafiği (Son {period})
              </h2>
            </div>
            
            <div className="h-48 w-full flex items-end gap-1.5 sm:gap-3 overflow-x-auto hide-scrollbar pt-4">
              {(() => {
                const maxVal = Math.max(...stats.chart_data.map(d => d.visits), 1);
                return stats.chart_data.map((d, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-[24px] group">
                    <div className="w-full flex-1 flex items-end relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-700 text-white text-[10px] py-0.5 px-1.5 rounded transition-opacity">
                        {d.visits}
                      </div>
                      <div 
                        className="w-full bg-blue-500/80 hover:bg-blue-400 rounded-t-sm transition-all" 
                        style={{ height: `${(d.visits / maxVal) * 100}%`, minHeight: d.visits > 0 ? '4px' : '0px' }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 font-mono whitespace-nowrap rotate-45 origin-top-left translate-x-2 sm:rotate-0 sm:translate-x-0">
                      {d.label}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
"""

content = content.replace("{/* --- Conversion Rates & Analytical Breakdown --- */}", chart_ui + "\n        {/* --- Conversion Rates & Analytical Breakdown --- */}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("updated page.tsx with charts and pct")
