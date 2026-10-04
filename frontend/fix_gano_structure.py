path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:380]
new_lines.extend([
    '              </div>\n',
    '              <p className="text-xs text-slate-500 font-medium mt-0.5">\n',
    '                YTÜ&apos;lülerin yeni nesil ders ve not yönetim portalı.\n',
    '              </p>\n',
    '            </div>\n',
    '          </a>\n'
])
new_lines.extend(lines[390:])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
