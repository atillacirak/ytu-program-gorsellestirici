import codecs

# --- page.tsx ---
path1 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\page.tsx'
content1 = codecs.open(path1, 'r', 'utf-8').read()

# Replace OBS guide box with warm gold/amber theme
content1 = content1.replace(
    '<div className="p-4 bg-[#002855]/[0.03] border border-[#002855]/15 rounded-xl space-y-2.5 text-left">',
    '<div className="p-4 bg-amber-500/[0.05] border border-amber-400/30 rounded-xl space-y-2.5 text-left">'
)

content1 = content1.replace(
    '<FileText className="w-4 h-4 text-[#002855]" />',
    '<FileText className="w-4 h-4 text-amber-600" />'
)

content1 = content1.replace(
    'flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-[#002855]/10 shadow-xs',
    'flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-amber-200/70 shadow-2xs'
)

content1 = content1.replace(
    '<span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">',
    '<span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">'
)

# PDF dropzone hover with soft golden glow
content1 = content1.replace(
    "border-slate-300 hover:border-[#002855] bg-slate-50/70 hover:bg-[#002855]/[0.03]",
    "border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-500/[0.03]"
)

codecs.open(path1, 'w', 'utf-8').write(content1)

# --- gano/page.tsx ---
path2 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content2 = codecs.open(path2, 'r', 'utf-8').read()

# Upload buttons -> warm golden amber button
content2 = content2.replace(
    'text-[#002855] bg-[#002855]/10 hover:bg-[#002855]/15',
    'text-amber-900 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30'
)

# Info/warning box -> clean amber styling
content2 = content2.replace(
    'bg-[#002855]/5 text-[#002855] p-3 rounded-xl flex gap-2 items-start text-sm border border-[#002855]/15',
    'bg-amber-500/[0.08] text-amber-900 p-3 rounded-xl flex gap-2 items-start text-sm border border-amber-400/30'
)

# Sticky result badge -> Rich Gold Gradient
content2 = content2.replace(
    'style={{ backgroundColor: \'#002855\' }}',
    'style={{ background: \'linear-gradient(135deg, #d97706 0%, #b45309 100%)\' }}'
)

codecs.open(path2, 'w', 'utf-8').write(content2)

print('Gold touch applied successfully!')
