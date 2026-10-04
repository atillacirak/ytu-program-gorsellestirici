import codecs

# --- page.tsx ---
path1 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\page.tsx'
content1 = codecs.open(path1, 'r', 'utf-8').read()

# OBS Guide box outer bg
content1 = content1.replace(
    'p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left',
    'p-4 bg-[#ac966e]/8 border border-[#ac966e]/25 rounded-xl space-y-2.5 text-left'
)
# Guide cards bg (white -> warm)
content1 = content1.replace(
    'flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200',
    'flex items-start gap-2.5 text-xs text-slate-600 bg-[#ac966e]/5 p-3 rounded-lg border border-[#ac966e]/20'
)
# PDF upload drop zone
content1 = content1.replace(
    "visualizerPdfUploading\n                      ? 'border-[#002855] bg-blue-50/40'\n                      : 'border-slate-300 hover:border-[#002855] bg-slate-50/70 hover:bg-slate-100/70'",
    "visualizerPdfUploading\n                      ? 'border-[#ac966e] bg-[#ac966e]/5'\n                      : 'border-slate-300 hover:border-[#ac966e] bg-[#ac966e]/5 hover:bg-[#ac966e]/10'"
)

codecs.open(path1, 'w', 'utf-8').write(content1)

# --- gano/page.tsx ---
path2 = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content2 = codecs.open(path2, 'r', 'utf-8').read()

# Black "Manuel Ekle" and "Dersleri Ekle" buttons -> navy
content2 = content2.replace(
    'text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm',
    'text-white bg-[#002855] hover:bg-[#001f42] px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm'
)

codecs.open(path2, 'w', 'utf-8').write(content2)

print('Done!')
