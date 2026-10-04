import codecs
path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content = codecs.open(path, 'r', 'utf-8').read()

replacements = [
    # Section header bars (panel top sections)
    ('bg-slate-50/50 flex flex-col md:flex-row', 'bg-[#ac966e]/5 flex flex-col md:flex-row'),
    # Table container bg
    ('border border-slate-200 rounded-xl bg-slate-50/50', 'border border-slate-200 rounded-xl bg-[#ac966e]/5'),
    # Table thead
    ('bg-slate-100/90 backdrop-blur-sm', 'bg-[#ac966e]/10 backdrop-blur-sm'),
    # Table row hover
    ('hover:bg-slate-50/30 transition-colors', 'hover:bg-[#ac966e]/5 transition-colors'),
    # Current courses table row bg
    ('bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider', 'bg-[#ac966e]/10 text-slate-500 text-xs uppercase tracking-wider'),
    # Nav tabs bg
    ('bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center', 'bg-[#ac966e]/10 p-1 rounded-xl border border-[#ac966e]/20 flex items-center'),
]

for old, new in replacements:
    content = content.replace(old, new)

codecs.open(path, 'w', 'utf-8').write(content)
print('Done!')
