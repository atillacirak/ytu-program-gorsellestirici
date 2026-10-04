import os
import shutil

src = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\admin\page.tsx'
dst_dir = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\stats'
dst_file = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\stats\page.tsx'

os.makedirs(dst_dir, exist_ok=True)
shutil.copy(src, dst_file)
print("Copied to /stats/page.tsx successfully!")

admin_dir = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\admin'
if os.path.exists(admin_dir):
    shutil.rmtree(admin_dir)
    print("Deleted /admin directory successfully!")
