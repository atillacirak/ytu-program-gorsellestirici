import re

file_path = 'frontend/src/app/stats/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific blocks manually
# 1. total_visits
visits_block = """            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <Eye size={12} className="text-blue-400" />
              <span>Benzersiz IP veya oturumlar</span>
            </div>"""
content = content.replace(visits_block, visits_block + "\n            {period !== 'all' && renderPct(stats?.pct_visits)}")

# 2. total_generated
generated_block = """            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>BaYaryla iYlenen PDF says</span>
            </div>"""
generated_block2 = """            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Başarıyla işlenen PDF sayısı</span>
            </div>"""
content = content.replace(generated_block, generated_block + "\n            {period !== 'all' && renderPct(stats?.pct_generated)}")
content = content.replace(generated_block2, generated_block2 + "\n            {period !== 'all' && renderPct(stats?.pct_generated)}")

# 3. total_gano_visits
gano_visits_block = """            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <Calculator size={12} className="text-indigo-400" />
              <span>GrǬntǬlenen AGNO sayfas says</span>
            </div>"""
gano_visits_block2 = """            <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/50">
              <Calculator size={12} className="text-indigo-400" />
              <span>Görüntülenen AGNO sayfası sayısı</span>
            </div>"""
content = content.replace(gano_visits_block, gano_visits_block + "\n            {period !== 'all' && renderPct(stats?.pct_gano_visits)}")
content = content.replace(gano_visits_block2, gano_visits_block2 + "\n            {period !== 'all' && renderPct(stats?.pct_gano_visits)}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("updated page.tsx with remaining pct blocks")
