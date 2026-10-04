import requests
import urllib3
import re
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

eef_programs = [
    {"name": "Bilgisayar Mühendisliği (%30 İngilizce)", "url": "https://bologna.yildiz.edu.tr/index.php?r=program/view&id=550&aid=3"},
    {"name": "Elektrik Mühendisliği (%30 İngilizce)", "url": "https://bologna.yildiz.edu.tr/index.php?r=program/view&id=7&aid=4"},
    {"name": "Elektronik & Haberleşme Mühendisliği (%30 İngilizce)", "url": "https://bologna.yildiz.edu.tr/index.php?r=program/view&id=6&aid=5"},
    {"name": "Kontrol ve Otomasyon Mühendisliği (%30 İngilizce)", "url": "https://bologna.yildiz.edu.tr/index.php?r=program/view&id=29&aid=18"},
    {"name": "Kontrol ve Otomasyon Mühendisliği (%100 İngilizce)", "url": "https://bologna.yildiz.edu.tr/index.php?r=program/view&id=403&aid=18"}
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

all_eef_courses = {}

print("=== ELEKTRIK-ELEKTRONIK FAKULTESI BOLOGNA TARAMASI BASLADI ===\n")

for prog in eef_programs:
    p_name = prog["name"]
    url = prog["url"]
    print(f"-> Taraniyor: {p_name}...")
    
    try:
        r = requests.get(url, headers=headers, verify=False, timeout=12)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')
        
        count_prog = 0
        tables = soup.find_all('table')
        
        for t in tables:
            for row in t.find_all('tr'):
                cols = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                if len(cols) >= 7:
                    code = cols[0].replace('*', '').strip()
                    # Check if valid course code pattern (e.g. BLM1011, ELE2011, EHB3011, KOM2011)
                    if re.match(r'^[A-Z]{3,4}\d{3,4}$', code):
                        c_name = cols[2] if len(cols) > 2 else ""
                        if not c_name and len(cols) > 3:
                            c_name = cols[3]
                            
                        # Column positions for Local Credits and ECTS:
                        # cols[-2] -> Local Credit, cols[-1] -> ECTS
                        local_credit = cols[-2] if len(cols) >= 2 else "0"
                        ects = cols[-1] if len(cols) >= 1 else "0"
                        
                        if code not in all_eef_courses:
                            all_eef_courses[code] = {
                                "code": code,
                                "name": c_name,
                                "credit": local_credit,
                                "ects": ects,
                                "programs": [p_name]
                            }
                        else:
                            if p_name not in all_eef_courses[code]["programs"]:
                                all_eef_courses[code]["programs"].append(p_name)
                                
                        count_prog += 1
                        
        print(f"   [OK] Bulunan ders sayisi: {count_prog}\n")
    except Exception as e:
        print(f"   [ERR] Hata ({p_name}): {e}\n")

print(f"=== TARAMA TAMAMLANDI! Toplam Tekil Ders Sayisi: {len(all_eef_courses)} ===\n")

print("---------------------------------------------------------------------------")
print(f"{'Ders Kodu':<10} | {'Ders Adı':<40} | {'Kredi':<6} | {'AKTS':<5}")
print("---------------------------------------------------------------------------")

sample_keys = list(all_eef_courses.keys())[:30]
for code in sample_keys:
    item = all_eef_courses[code]
    print(f"{item['code']:<10} | {item['name'][:38]:<40} | {item['credit']:<6} | {item['ects']:<5}")

print("---------------------------------------------------------------------------")
