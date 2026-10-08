import json
import re

with open("raw_clubs.txt", "r", encoding="utf-8") as f:
    raw_data = f.read()

lines = raw_data.strip().split('\n')
clubs = []

for i in range(0, len(lines), 3):
    if i + 2 >= len(lines):
        break
    
    line1 = lines[i]
    line2 = lines[i+1]
    line3 = lines[i+2]
    
    # Extract data using regex or simple splits
    match1 = re.match(r'\s*Adı\s+(.*?)\s+Topluluğun İletişim Telefonu\s+(.*)', line1)
    match2 = re.match(r'\s*Başkanı\s+(.*?)\s+Topluluğun E-Posta Adresi\s+(.*)', line2)
    match3 = re.match(r'\s*Akademik Danışmanı\s+(.*)', line3)
    
    if match1 and match2 and match3:
        club_name = match1.group(1).strip()
        contact1 = match1.group(2).strip()
        
        president = match2.group(1).strip()
        contact2 = match2.group(2).strip()
        
        advisor = match3.group(1).strip()
        
        email = contact1 if '@' in contact1 else (contact2 if '@' in contact2 else "")
        phone = contact2 if contact2.isdigit() or len(contact2) > 8 and '@' not in contact2 else (contact1 if contact1.isdigit() or len(contact1) > 8 and '@' not in contact1 else "")
        
        clubs.append({
            "name": club_name,
            "president": president,
            "advisor": advisor,
            "email": email,
            "phone": phone
        })

with open("backend/ytu_clubs.json", "w", encoding="utf-8") as f:
    json.dump(clubs, f, ensure_ascii=False, indent=2)

print(f"Parsed and saved {len(clubs)} clubs to backend/ytu_clubs.json")
