path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(r"YTÜ\'lülerin", "YTÜ'lülerin")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
