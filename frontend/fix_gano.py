path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if '</h1>' in line:
        new_lines.append('              </div>\n              <p className="text-xs text-slate-500 font-medium mt-0.5">\n                YTÜ\'lülerin yeni nesil ders ve not yönetim portalı.\n              </p>\n')
        
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
