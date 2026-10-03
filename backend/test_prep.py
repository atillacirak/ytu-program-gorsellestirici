# -*- coding: utf-8 -*-
import pdfplumber
import json
import re

schedules = {}

def normalize_time(t_str):
    # e.g., '13.15-14.00' -> '13:15', '14:00'
    t_str = t_str.replace('.', ':').replace(' ', '')
    parts = t_str.split('-')
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return None, None

with pdfplumber.open("prep_schedule.pdf") as pdf:
    for page in pdf.pages:
        # Extract labels
        rotated = [c for c in page.chars if c["matrix"][1] != 0 or c["matrix"][2] != 0]
        rotated = sorted(rotated, key=lambda x: x['top'])
        labels = []
        current_label = []
        for i, c in enumerate(rotated):
            current_label.append(c)
            if i < len(rotated) - 1 and abs(rotated[i+1]['top'] - c['top']) > 15:
                labels.append("".join([x['text'] for x in sorted(current_label, key=lambda x: -x['top'])]))
                current_label = []
        if current_label:
            labels.append("".join([x['text'] for x in sorted(current_label, key=lambda x: -x['top'])]))
            
        tables = page.extract_tables()
        if not tables:
            continue
        
        table = tables[0]
        
        # We need to split the giant table into chunks based on MONDAY header
        chunks = []
        current_chunk = []
        for row in table:
            # Normal header: MONDAY in col 2, TUESDAY in col 3
            is_normal_header = row and len(row) > 3 and row[2] == "MONDAY" and row[3] == "TUESDAY"
            # Truncated header: MONDAY/TUESDAY columns are empty/missing but WEDNESDAY is in col 4
            # This happens on some pages where the class grid spans a page boundary
            is_truncated_header = (row and len(row) > 4 and 
                                   (not row[2] or not row[2].strip()) and 
                                   (not row[3] or not row[3].strip()) and 
                                   row[4] == "WEDNESDAY")
            
            if is_normal_header or is_truncated_header:
                if current_chunk:
                    chunks.append(current_chunk)
                # For truncated headers, synthesize a full header row
                if is_truncated_header:
                    row = list(row)
                    row[2] = "MONDAY"
                    row[3] = "TUESDAY"
                current_chunk = [row]
            elif current_chunk:
                current_chunk.append(row)
        if current_chunk:
            chunks.append(current_chunk)
            
        for idx, chunk in enumerate(chunks):
            if idx >= len(labels):
                break
            label = labels[idx]
            
            days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"]
            room = label.split("/")[-1] if "/" in label else "Bilinmiyor"
            schedule = { "Pazartesi": [], "Salı": [], "Çarşamba": [], "Perşembe": [], "Cuma": [] }
            
            for row in chunk:
                # Need to find rows that have a time interval in col 1 (or sometimes it might be shifted, so check row for time)
                time_col = None
                for cell_idx, cell in enumerate(row):
                    if cell and re.search(r'\d{2}[:.]\d{2}\s*-\s*\d{2}[:.]\d{2}', cell):
                        time_col = cell_idx
                        break
                
                if time_col is not None:
                    time_str = re.search(r'\d{2}[:.]\d{2}\s*-\s*\d{2}[:.]\d{2}', row[time_col]).group()
                    start_time, end_time = normalize_time(time_str)
                    
                    if not start_time:
                        continue
                    
                    # Days start right after the time col, typically time_col is 1, so days are 2,3,4,5,6
                    for d_idx, day in enumerate(days):
                        target_col = time_col + 1 + d_idx
                        if target_col < len(row):
                            inst = row[target_col]
                            if inst and inst.strip():
                                inst = inst.replace("\n", " ").strip()
                                # If there's any actual word character, count it as an instructor
                                if re.search(r'[A-Za-zĞÜŞİÖÇğüşiöç]', inst):
                                    schedule[day].append({
                                        "start_time": start_time,
                                        "end_time": end_time,
                                        "code": "HAZIRLIK",
                                        "name": "İngilizce Hazırlık",
                                        "instructor": inst,
                                        "classroom": room
                                    })
            
            schedules[label] = {
                "label": label,
                "room": room,
                "schedule": schedule
            }

with open("../frontend/src/data/prepSchedules.json", "w", encoding="utf-8") as f:
    json.dump(schedules, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(schedules)} schedules perfectly!")