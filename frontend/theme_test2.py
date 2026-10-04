import codecs
path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content = codecs.open(path, 'r', 'utf-8').read()

replacements = [
    # Transkript Yükle butonu (mavi -> altın)
    (
        'text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-medium ${isUploadingTranscript',
        'text-[#7a6640] bg-[#ac966e]/15 hover:bg-[#ac966e]/25 px-3 py-1.5 rounded-lg transition-colors font-medium ${isUploadingTranscript'
    ),
    # Programdan Çek butonu (mavi -> altın)
    (
        'text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-medium ${isUploadingSchedule',
        'text-[#7a6640] bg-[#ac966e]/15 hover:bg-[#ac966e]/25 px-3 py-1.5 rounded-lg transition-colors font-medium ${isUploadingSchedule'
    ),
    # Amber uyarı kutusu -> altın
    (
        'bg-amber-50 text-amber-700 p-3 rounded-xl flex gap-2 items-start text-sm border border-amber-100/50',
        'bg-[#ac966e]/10 text-[#7a6640] p-3 rounded-xl flex gap-2 items-start text-sm border border-[#ac966e]/20'
    ),
]

for old, new in replacements:
    content = content.replace(old, new)

codecs.open(path, 'w', 'utf-8').write(content)
print('Done!')
