path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\page.tsx'
content = open(path, encoding='utf-8').read()

replacements = [
    # Header logo area
    ('w-10 h-10 rounded-lg bg-[#0c3f79] group-hover:bg-[#00306a] flex items-center justify-center text-white shadow-xs transition-colors',
     'w-9 h-9 rounded-lg bg-[#0c3f79] group-hover:bg-[#00306a] flex items-center justify-center text-white shadow-xs transition-colors'),
    ('GraduationCap className="w-6 h-6 text-[#e7a240]"',
     'GraduationCap className="w-5 h-5 text-[#e7a240]"'),
    # Header title
    ('text-base sm:text-lg font-bold text-slate-900',
     'text-sm sm:text-base font-bold text-slate-900'),
    # Tab bar buttons
    ('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
     'px-2.5 py-1 rounded-lg text-xs font-bold transition-all'),
    # AGNO link button in nav
    ('px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600 hover:text-slate-900',
     'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600 hover:text-slate-900'),
    # Upload area text
    ('text-3xl sm:text-4xl font-black text-[#0c3f79] font-mono tracking-tighter',
     'text-2xl sm:text-3xl font-black text-[#0c3f79] font-mono tracking-tighter'),
    # Info cards grid
    ('grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2',
     'grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-1'),
    # info card padding
    ('p-4 rounded-xl bg-[#e7a240]/[0.06] border border-[#e7a240]/25 text-left space-y-1 shadow-2xs hover:bg-[#e7a240]/[0.10] transition-colors',
     'p-3 rounded-xl bg-[#e7a240]/[0.06] border border-[#e7a240]/25 text-left space-y-1 shadow-2xs hover:bg-[#e7a240]/[0.10] transition-colors'),
    # OBS guide card padding
    ('p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-6',
     'p-4 sm:p-6 shadow-xs relative overflow-hidden space-y-5'),
    # Schedule table header row
    ('border-b border-slate-300 text-slate-700 bg-slate-100',
     'border-b border-slate-300 text-slate-700 bg-slate-100 text-[10px]'),
    # Main schedule grid section heading
    ('text-xl sm:text-2xl font-bold text-slate-900 tracking-tight',
     'text-base sm:text-xl font-bold text-slate-900 tracking-tight'),
]

for old, new in replacements:
    content = content.replace(old, new)

open(path, 'w', encoding='utf-8').write(content)
print("Main page scaled down!")
