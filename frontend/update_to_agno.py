import codecs
import os

# 1. Update gano/page.tsx
p_gano = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
c_gano = codecs.open(p_gano, 'r', 'utf-8').read()
c_gano = c_gano.replace('<span>GANO Hesapla</span>', '<span>AGNO Hesapla</span>')
c_gano = c_gano.replace('>GANO Hesaplayıcı</h1>', '>AGNO Hesaplayıcı</h1>')
c_gano = c_gano.replace('>Mevcut GANO</label>', '>Mevcut AGNO</label>')
c_gano = c_gano.replace('>Yeni GANO</div>', '>Yeni AGNO</div>')
c_gano = c_gano.replace("GANO'ya katılır", "AGNO'ya katılır")
c_gano = c_gano.replace("// Calculate new GANO", "// Calculate new AGNO")
codecs.open(p_gano, 'w', 'utf-8').write(c_gano)
print("gano/page.tsx updated!")

# 2. Update page.tsx
p_main = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\page.tsx'
c_main = codecs.open(p_main, 'r', 'utf-8').read()
c_main = c_main.replace('<span>GANO Hesapla</span>', '<span>AGNO Hesapla</span>')
codecs.open(p_main, 'w', 'utf-8').write(c_main)
print("page.tsx updated!")

# 3. Update admin/page.tsx
p_admin = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\admin\page.tsx'
c_admin = codecs.open(p_admin, 'r', 'utf-8').read()
c_admin = c_admin.replace('GANO Sayfası Ziyareti', 'AGNO Sayfası Ziyareti')
c_admin = c_admin.replace('GANO Senaryo / Belge', 'AGNO Senaryo / Belge')
c_admin = c_admin.replace('GANO için yüklenen transkript/program', 'AGNO için yüklenen transkript/program')
c_admin = c_admin.replace('GANO Sayfası İlgisi', 'AGNO Sayfası İlgisi')
c_admin = c_admin.replace('GANO Hesaplama modülüne geçiş yaptı', 'AGNO Hesaplama modülüne geçiş yaptı')
c_admin = c_admin.replace('GANO Belge Yükleme Başarısı', 'AGNO Belge Yükleme Başarısı')
c_admin = c_admin.replace('GANO sayfasına girenlerin', 'AGNO sayfasına girenlerin')
codecs.open(p_admin, 'w', 'utf-8').write(c_admin)
print("admin/page.tsx updated!")

# 4. Update DevColorPanel.tsx
p_dev = r'C:\Projeler\Ytü Görselleştir\frontend\src\components\DevColorPanel.tsx'
if os.path.exists(p_dev):
    c_dev = codecs.open(p_dev, 'r', 'utf-8').read()
    c_dev = c_dev.replace('Yeni GANO', 'Yeni AGNO')
    codecs.open(p_dev, 'w', 'utf-8').write(c_dev)
    print("DevColorPanel.tsx updated!")

# 5. Update generate_brand_icons.py & regenerate og-image.png
p_icons = r'C:\Projeler\Ytü Görselleştir\frontend\generate_brand_icons.py'
c_icons = codecs.open(p_icons, 'r', 'utf-8').read()
c_icons = c_icons.replace('GANO & YANO', 'AGNO & YANO')
codecs.open(p_icons, 'w', 'utf-8').write(c_icons)
print("generate_brand_icons.py updated!")
