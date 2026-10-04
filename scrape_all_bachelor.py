import os
import json
import time
import requests
import urllib3
import re
import sqlite3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
base_bachelor_url = 'https://bologna.yildiz.edu.tr/index.php?r=program/bachelor'

print("=== YTU BOLOGNA TUM LISANS PROGRAMLARI TARAMASI BASLADI ===")

try:
    r = requests.get(base_bachelor_url, headers=headers, verify=False, timeout=15)
    r.encoding = 'utf-8'
    soup = BeautifulSoup(r.text, 'html.parser')
    
    programs = []
    for a in soup.find_all('a'):
        href = a.get('href', '')
        text = a.get_text(strip=True)
        if 'r=program/view' in href:
            full_url = f'https://bologna.yildiz.edu.tr{href}' if href.startswith('/') else href
            programs.append({'name': text, 'url': full_url})
            
    print(f"[OK] Toplam {len(programs)} adet Lisans Programi bulundu.")
except Exception as e:
    print(f"[ERR] Ana sayfa taranamadi: {e}")
    programs = []

all_courses = {}

for idx, prog in enumerate(programs, 1):
    p_name = prog["name"]
    url = prog["url"]
    print(f"[{idx}/{len(programs)}] Taraniyor: {p_name}...")
    
    try:
        res = requests.get(url, headers=headers, verify=False, timeout=15)
        res.encoding = 'utf-8'
        soup_prog = BeautifulSoup(res.text, 'html.parser')
        
        tables = soup_prog.find_all('table')
        prog_added = 0
        
        for t in tables:
            for row in t.find_all('tr'):
                cols = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                if len(cols) >= 7:
                    code = cols[0].replace('*', '').strip()
                    # Check if valid course code format (e.g. MAT1071, BLM1011, FIZ1001, YZM2051)
                    if re.match(r'^[A-Z]{3,4}\d{3,4}$', code):
                        c_name = cols[2] if len(cols) > 2 else ""
                        if not c_name and len(cols) > 3:
                            c_name = cols[3]
                            
                        local_credit_str = cols[-2] if len(cols) >= 2 else "0"
                        ects_str = cols[-1] if len(cols) >= 1 else "0"
                        
                        try:
                            local_credit = float(local_credit_str.replace(',', '.'))
                        except:
                            local_credit = 0.0
                            
                        try:
                            ects = float(ects_str.replace(',', '.'))
                        except:
                            ects = 0.0
                            
                        if code not in all_courses:
                            all_courses[code] = {
                                "code": code,
                                "name": c_name,
                                "credits": local_credit,
                                "ects": ects,
                                "programs": [p_name]
                            }
                        else:
                            if p_name not in all_courses[code]["programs"]:
                                all_courses[code]["programs"].append(p_name)
                                
                        prog_added += 1
                        
        print(f"   -> {prog_added} ders alindi.")
    except Exception as e:
        print(f"   -> Hata: {e}")
        
    time.sleep(0.15)

print(f"\n[OK] TARAMA BITTI! Toplam Tekil Ders Sayisi: {len(all_courses)}")

# Save to JSON
json_path = r'C:\Projeler\Ytü Görselleştir\backend\data\bologna_all_bachelor_courses.json'
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(all_courses, f, ensure_ascii=False, indent=2)

print(f"[OK] {json_path} dosyasina kaydedildi!")

# Also update SQLite database
db_path = r'C:\Projeler\Ytü Görselleştir\backend\ytu_courses.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

inserted = 0
updated = 0

for code, data in all_courses.items():
    c.execute("SELECT id FROM courses WHERE code = ?", (code,))
    row = c.fetchone()
    if row:
        c.execute("UPDATE courses SET name = ?, credits = ?, ects = ? WHERE code = ?", 
                  (data["name"], data["credits"], data["ects"], code))
        updated += 1
    else:
        dept = code[:3]
        c.execute("INSERT INTO courses (department_code, code, name, year, is_elective, credits, ects, instructor, is_online, days, semester) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  (dept, code, data["name"], 1, 0, data["credits"], data["ects"], "Bölüm Öğretim Üyeleri", 0, "Pazartesi", "Güz"))
        inserted += 1

conn.commit()
conn.close()

print(f"[OK] SQLite Database Guncellendi: {updated} ders guncellendi, {inserted} yeni ders eklendi!")
