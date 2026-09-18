# -*- coding: utf-8 -*-
import os
import re
import shutil
import sqlite3
import tempfile
from typing import Dict, List, Any, Optional

import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title='YTÜ Program Görselleştirici API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ytu_courses.db')

@app.get('/')
def root():
    return {'status': 'active', 'service': 'YTÜ Program Görselleştirici API'}

@app.post('/api/parse-student-schedule')
async def parse_student_schedule_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Lütfen geçerli bir PDF dosyası yükleyin.')

    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        conn = None
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
        else:
            cursor = None

        student_title = ''
        student_id = ''
        student_name = ''
        term = ''

        schedule = {
            'Pazartesi': [],
            'Salı': [],
            'Çarşamba': [],
            'Perşembe': [],
            'Cuma': [],
            'Cumartesi': [],
            'Pazar': []
        }

        item_regex = re.compile(r'(\d+)\s+([A-ZÇĞİÖŞÜ0-9_]{2,10})\s+(.*?)\s+(\d{1,2}[\.:]\d{2})\s+(\d{1,2}[\.:]\d{2}u?)')

        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ''
                for line in text.split('\n'):
                    if 'Öğrenci Ders Programı' in line or 'renci Ders Program' in line:
                        student_title = line.strip()
                        m_hdr = re.search(r'/\s*([0-9]+)\s*/\s*(.*?)\s*-\s*([0-9]{4}\s*-\s*[0-9]{4}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)', student_title)
                        if m_hdr:
                            student_id = m_hdr.group(1).strip()
                            student_name = m_hdr.group(2).strip()
                            term = m_hdr.group(3).strip()
                        else:
                            parts = student_title.split('/')
                            if len(parts) >= 3:
                                student_id = parts[1].strip()
                                student_name = parts[2].split('-')[0].strip()
                        break

                words = page.extract_words()
                rows = {}
                for w in words:
                    if w['top'] < 80 and 'Pazartesi' not in w['text']:
                        continue
                    matched_y = None
                    for ey in rows:
                        if abs(ey - w['top']) <= 4.0:
                            matched_y = ey
                            break
                    if matched_y is None:
                        matched_y = w['top']
                        rows[matched_y] = []
                    rows[matched_y].append(w)

                sorted_y = sorted(rows.keys())

                for y_val in sorted_y:
                    row_words = sorted(rows[y_val], key=lambda x: x['x0'])
                    col_bounds = [
                        (0, 225, 'Pazartesi' if y_val < 300 else 'Cuma'),
                        (225, 425, 'Salı' if y_val < 300 else 'Cumartesi'),
                        (425, 625, 'Çarşamba' if y_val < 300 else 'Pazar'),
                        (625, 850, 'Perşembe' if y_val < 300 else None),
                    ]

                    for min_x, max_x, target_day in col_bounds:
                        if not target_day:
                            continue
                        cell_words = [w for w in row_words if min_x <= w['x0'] < max_x]
                        if not cell_words:
                            continue
                        cell_str = ' '.join([w['text'] for w in cell_words])

                        m = item_regex.search(cell_str)
                        if m:
                            sec_no, code, classroom, start_t, end_t = m.groups()
                            code = code.replace(' ', '').upper()
                            start_t_clean = start_t.replace('.', ':')
                            end_t_clean = end_t.replace('u', '').replace('.', ':')

                            course_name = code
                            instructor = ''

                            if cursor:
                                cursor.execute('SELECT name, instructor FROM courses WHERE code = ? LIMIT 1', (code,))
                                c_row = cursor.fetchone()
                                if c_row:
                                    course_name = c_row['name']
                                    instructor = c_row['instructor'] or ''

                                cursor.execute(
                                    'SELECT instructor FROM sections WHERE course_code = ? AND (section_id = ? OR section_id = ? OR section_id = ?) LIMIT 1',
                                    (code, sec_no, f'Gr{sec_no}', f'Gr.{sec_no}')
                                )
                                sec_db = cursor.fetchone()
                                if sec_db and sec_db['instructor']:
                                    instructor = sec_db['instructor']

                            schedule[target_day].append({
                                'section': sec_no,
                                'code': code,
                                'name': course_name,
                                'classroom': classroom.strip(),
                                'instructor': instructor,
                                'start_time': start_t_clean,
                                'end_time': end_t_clean,
                                'is_lab': 'LAB' in classroom.upper()
                            })

        if conn:
            conn.close()

        # Merge consecutive hours for the same course block
        merged_schedule = {}
        courses_summary_map = {}

        for day, items in schedule.items():
            if not items:
                merged_schedule[day] = []
                continue
            items.sort(key=lambda x: x['start_time'])
            merged = []
            for it in items:
                if (
                    merged and
                    merged[-1]['code'] == it['code'] and
                    merged[-1]['section'] == it['section'] and
                    merged[-1]['classroom'] == it['classroom']
                ):
                    merged[-1]['end_time'] = it['end_time']
                else:
                    merged.append(it.copy())
            merged_schedule[day] = merged

            for it in merged:
                ckey = (it['code'], it['section'])
                if ckey not in courses_summary_map:
                    courses_summary_map[ckey] = {
                        'code': it['code'],
                        'name': it['name'],
                        'section': it['section'],
                        'instructor': it['instructor'],
                        'classrooms': set(),
                        'time_slots': []
                    }
                courses_summary_map[ckey]['classrooms'].add(it['classroom'])
                courses_summary_map[ckey]['time_slots'].append({
                    'day': day,
                    'start_time': it['start_time'],
                    'end_time': it['end_time'],
                    'classroom': it['classroom'],
                    'is_lab': it['is_lab']
                })

        summary_list = []
        for ckey, cinfo in courses_summary_map.items():
            cinfo['classrooms'] = sorted(list(cinfo['classrooms']))
            summary_list.append(cinfo)

        return {
            'status': 'success',
            'student_id': student_id,
            'student_name': student_name,
            'term': term,
            'title': student_title,
            'schedule': merged_schedule,
            'courses_summary': summary_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF ayrıştırılırken hata oluştu: {str(e)}')
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
