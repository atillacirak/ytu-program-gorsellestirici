import re

path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\agno\page.tsx'
content = open(path, encoding='utf-8').read()

# ─── Spacing & Padding ───
replacements = [
    # Main container spacing
    ('max-w-4xl mx-auto space-y-6 pb-32 px-4 md:px-8', 'max-w-4xl mx-auto space-y-4 pb-28 px-3 md:px-6'),
    # Header section spacing
    ('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8', 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5'),
    # Hero icon container
    ('p-3 bg-blue-100 text-blue-600 rounded-xl', 'p-2.5 bg-blue-100 text-blue-600 rounded-xl'),
    # Hero icon size
    ('<Calculator size={28} />', '<Calculator size={22} />'),
    # Page title
    ('text-2xl font-bold text-slate-900', 'text-xl font-bold text-slate-900'),
    # Page subtitle
    ('text-slate-500 text-sm sm:text-base', 'text-slate-500 text-xs sm:text-sm'),
    # Card grid padding
    ('p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6', 'p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4'),
    # GPA inputs
    ('bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium', 'bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-sm'),
    # Course table padding
    ('p-3 rounded-xl', 'p-2.5 rounded-lg'),
    # Table header
    ('text-[11px] uppercase font-bold tracking-widest text-slate-500', 'text-[10px] uppercase font-bold tracking-widest text-slate-500'),
    # Add course button
    ('<Plus size={16} />', '<Plus size={14} />'),
    ('text-sm flex items-center gap-1.5 text-white bg-[#0c3f79] hover:bg-[#00306a] px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm', 'text-xs flex items-center gap-1.5 text-white bg-[#0c3f79] hover:bg-[#00306a] px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm'),
    # Upload button
    ('text-sm flex items-center gap-1.5 text-[#8a5611] bg-[#e7a240]/15 hover:bg-[#e7a240]/25 border border-[#e7a240]/30 px-3 py-1.5 rounded-lg transition-colors font-medium', 'text-xs flex items-center gap-1.5 text-[#8a5611] bg-[#e7a240]/15 hover:bg-[#e7a240]/25 border border-[#e7a240]/30 px-2.5 py-1.5 rounded-lg transition-colors font-medium'),
    # Trash button
    ('text-sm flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-medium', 'text-xs flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium'),
    # Reset button
    ('text-sm flex items-center justify-center gap-1.5 text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors font-medium shadow-sm', 'text-xs flex items-center justify-center gap-1.5 text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors font-medium shadow-sm'),
    # Card header padding
    ('p-4 border-b border-slate-100 bg-[#0c3f79]/5 flex flex-col md:flex-row md:justify-between md:items-center gap-4', 'p-3 border-b border-slate-100 bg-[#0c3f79]/5 flex flex-col md:flex-row md:justify-between md:items-center gap-3'),
    # Section labels
    ('text-sm font-semibold text-slate-600', 'text-xs font-semibold text-slate-600'),
    # Section header icon
    ('<GraduationCap size={20} className="text-slate-400" />', '<GraduationCap size={16} className="text-slate-400" />'),
    # Course row inputs - size
    ('px-2 py-2 text-sm', 'px-1.5 py-1.5 text-xs'),
    # Sticky bottom bar elements
    ('text-white/90 text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5', 'text-white/90 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider mb-0'),
    ('text-xl sm:text-3xl font-bold flex items-center gap-1', 'text-lg sm:text-2xl font-bold flex items-center gap-1'),
    ('text-xs sm:text-sm font-medium text-white/70 whitespace-nowrap', 'text-[10px] sm:text-xs font-medium text-white/70 whitespace-nowrap'),
    # GPA section spacing
    ('space-y-6', 'space-y-4'),
    ('space-y-2', 'space-y-1.5'),
]

for old, new in replacements:
    content = content.replace(old, new)

open(path, 'w', encoding='utf-8').write(content)
print("AGNO page scaled down!")
