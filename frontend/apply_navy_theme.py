import codecs

# --- page.tsx ---
path1 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\page.tsx'
content1 = codecs.open(path1, 'r', 'utf-8').read()

# OBS Guide box outer bg
content1 = content1.replace(
    'p-4 bg-[#ac966e]/8 border border-[#ac966e]/25 rounded-xl space-y-2.5 text-left',
    'p-4 bg-[#002855]/[0.03] border border-[#002855]/15 rounded-xl space-y-2.5 text-left'
)
# Guide cards bg
content1 = content1.replace(
    'flex items-start gap-2.5 text-xs text-slate-600 bg-[#ac966e]/5 p-3 rounded-lg border border-[#ac966e]/20',
    'flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-[#002855]/10 shadow-xs'
)
# PDF dropzone
content1 = content1.replace(
    "border-slate-300 hover:border-[#ac966e] bg-[#ac966e]/5 hover:bg-[#ac966e]/10",
    "border-slate-300 hover:border-[#002855] bg-slate-50/70 hover:bg-[#002855]/[0.03]"
)

codecs.open(path1, 'w', 'utf-8').write(content1)

# --- gano/page.tsx ---
path2 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content2 = codecs.open(path2, 'r', 'utf-8').read()

# Nav tabs wrapper
content2 = content2.replace(
    'bg-[#ac966e]/10 p-1 rounded-xl border border-[#ac966e]/20 flex items-center gap-1',
    'bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1'
)

# Panel headers
content2 = content2.replace(
    'bg-[#ac966e]/5 flex flex-col md:flex-row',
    'bg-[#002855]/5 flex flex-col md:flex-row'
)

# Upload buttons
content2 = content2.replace(
    'text-[#7a6640] bg-[#ac966e]/15 hover:bg-[#ac966e]/25',
    'text-[#002855] bg-[#002855]/10 hover:bg-[#002855]/15'
)

# Warning/Info box
content2 = content2.replace(
    'bg-[#ac966e]/10 text-[#7a6640] p-3 rounded-xl flex gap-2 items-start text-sm border border-[#ac966e]/20',
    'bg-[#002855]/5 text-[#002855] p-3 rounded-xl flex gap-2 items-start text-sm border border-[#002855]/15'
)

# Tables container
content2 = content2.replace(
    'border border-slate-200 rounded-xl bg-[#ac966e]/5',
    'border border-slate-200 rounded-xl bg-[#002855]/[0.02]'
)

# Table theads
content2 = content2.replace(
    'bg-[#ac966e]/10 backdrop-blur-sm',
    'bg-[#002855]/5 backdrop-blur-sm'
)
content2 = content2.replace(
    'bg-[#ac966e]/10 text-slate-500 text-xs uppercase tracking-wider',
    'bg-[#002855]/5 text-slate-600 text-xs uppercase tracking-wider'
)

# Table rows hover
content2 = content2.replace(
    'hover:bg-[#ac966e]/5 transition-colors',
    'hover:bg-[#002855]/[0.04] transition-colors'
)

# Sticky result badge -> YTÜ Navy instead of brown/gold
content2 = content2.replace(
    "style={{ backgroundColor: '#ac966e' }}",
    "style={{ backgroundColor: '#002855' }}"
)

codecs.open(path2, 'w', 'utf-8').write(content2)

print('Updated theme successfully to Navy palette!')
