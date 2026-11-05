# -*- coding: utf-8 -*-
import os
import re
import json
import shutil
import sqlite3
import tempfile
from typing import Dict, List, Any, Optional

import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import stats_db
import uygun_musun_store

app = FastAPI(title='YTÜ Program Görselleştirici API', version='1.0.0')

@app.get('/api/stats')
def get_stats_endpoint(period: str = 'all'):
    return stats_db.get_stats(period)

@app.post('/api/stats/visit')
def increment_visit_endpoint():
    try:
        stats_db.increment_stat('total_visits')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

@app.post('/api/stats/generate')
def increment_generate_endpoint(source: str = 'pdf'):
    try:
        stats_db.increment_stat('total_generated')
        if source == 'prep':
            stats_db.increment_stat('total_generated_prep')
        else:
            stats_db.increment_stat('total_generated_pdf')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

@app.post('/api/stats/gano-visit')
def increment_gano_visit_endpoint():
    try:
        stats_db.increment_stat('total_gano_visits')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

@app.post('/api/stats/gano-scenario')
def increment_gano_scenario_endpoint():
    try:
        stats_db.increment_stat('total_gano_scenarios')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

@app.post('/api/stats/devamsizlik-visit')
def increment_devamsizlik_visit_endpoint():
    try:
        stats_db.increment_stat('total_devamsizlik_visits')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

@app.post('/api/stats/planlama-visit')
def increment_planlama_visit_endpoint():
    try:
        stats_db.increment_stat('total_planlama_visits')
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'detail': str(e)}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'https://ytudostun.com',
        'https://www.ytudostun.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

MAX_UPLOAD_BYTES = 12 * 1024 * 1024  # 12 MB
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ytu_courses.db')
CURRICULA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'bologna_curricula.json')
_CURRICULA_CACHE: Optional[Dict[str, Any]] = None
_CURRICULA_MTIME: float = 0.0


def _init_sqlite_optimizations() -> None:
    """Create expression indexes and enable WAL mode on ytu_courses.db at startup."""
    if not os.path.exists(DB_PATH):
        return
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute('PRAGMA journal_mode = WAL;')
        conn.execute('PRAGMA synchronous = NORMAL;')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_courses_code_exact ON courses(code);')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_courses_code_norm ON courses(UPPER(REPLACE(code, " ", "")));')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_courses_name_norm ON courses(UPPER(REPLACE(name, " ", "")));')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_sections_lookup ON sections(course_code, section_id);')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"SQLite optimization init warning: {e}")


_init_sqlite_optimizations()


def _get_db_connection() -> Optional[sqlite3.Connection]:
    if not os.path.exists(DB_PATH):
        return None
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)
    except Exception:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute('PRAGMA temp_store = MEMORY;')
        conn.execute('PRAGMA mmap_size = 30000000;')
    except Exception:
        pass
    return conn


def _save_upload_to_tempfile(file: UploadFile, suffix: str) -> str:
    """Safely stream upload to a temporary file while enforcing MAX_UPLOAD_BYTES."""
    total_read = 0
    chunk_size = 64 * 1024
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        while True:
            chunk = file.file.read(chunk_size)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > MAX_UPLOAD_BYTES:
                tmp.close()
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
                raise HTTPException(
                    status_code=413,
                    detail='Dosya boyutu çok büyük (Maksimum 12 MB yükleyebilirsiniz).'
                )
            tmp.write(chunk)
    return tmp_path


def _load_curricula() -> Dict[str, Any]:
    global _CURRICULA_CACHE, _CURRICULA_MTIME
    if os.path.exists(CURRICULA_PATH):
        mtime = os.path.getmtime(CURRICULA_PATH)
        if _CURRICULA_CACHE is None or mtime != _CURRICULA_MTIME:
            with open(CURRICULA_PATH, 'r', encoding='utf-8') as f:
                _CURRICULA_CACHE = json.load(f)
            _CURRICULA_MTIME = mtime
    elif _CURRICULA_CACHE is None:
        _CURRICULA_CACHE = {'faculties': []}
    return _CURRICULA_CACHE


@app.get('/api/curricula/programs')
def get_curricula_programs():
    data = _load_curricula()
    faculties_out = []
    for fac in data.get('faculties', []):
        faculties_out.append({
            'faculty': fac.get('faculty', ''),
            'programs': [
                {'id': p.get('id'), 'name': p.get('name')}
                for p in fac.get('programs', [])
            ]
        })
    return {'status': 'success', 'faculties': faculties_out}


@app.get('/api/curricula/program/{program_id}')
def get_curriculum_by_program(program_id: str):
    data = _load_curricula()
    for fac in data.get('faculties', []):
        for prog in fac.get('programs', []):
            if str(prog.get('id')) == str(program_id):
                return {
                    'status': 'success',
                    'faculty': fac.get('faculty', ''),
                    'program': prog
                }
    raise HTTPException(status_code=404, detail='Program müfredatı bulunamadı.')


@app.api_route('/', methods=['GET', 'HEAD'])
def root():
    return {'status': 'active', 'service': 'YTÜ Program Görselleştirici API'}


@app.get('/api/course-lookup')
def course_lookup_endpoint(code: Optional[str] = None, name: Optional[str] = None):
    if not code and not name:
        return {'status': 'success', 'found': False, 'message': 'Ders kodu veya ismi belirtilmedi.'}

    conn = _get_db_connection()
    if not conn:
        return {'status': 'error', 'detail': 'Veritabanı bulunamadı.'}

    try:
        cursor = conn.cursor()
        row = None

        if code and code.strip():
            code_clean = code.strip().upper().replace(' ', '')
            cursor.execute(
                'SELECT code, name, credits, ects FROM courses WHERE UPPER(REPLACE(code, " ", "")) = ? LIMIT 1',
                (code_clean,)
            )
            row = cursor.fetchone()

        if not row and name and name.strip():
            name_clean = name.strip()
            if len(name_clean) >= 3:
                cursor.execute(
                    'SELECT code, name, credits, ects FROM courses WHERE UPPER(REPLACE(name, " ", "")) = UPPER(REPLACE(?, " ", "")) LIMIT 1',
                    (name_clean,)
                )
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        'SELECT code, name, credits, ects FROM courses WHERE UPPER(name) LIKE UPPER(?) LIMIT 1',
                        (f"%{name_clean}%",)
                    )
                    row = cursor.fetchone()
    finally:
        conn.close()

    if row:
        return {
            'status': 'success',
            'found': True,
            'course': {
                'code': row['code'],
                'name': row['name'],
                'credits': float(row['credits']) if row['credits'] is not None else 0.0,
                'ects': float(row['ects']) if row['ects'] is not None else 0.0
            }
        }
    else:
        return {
            'status': 'success',
            'found': False,
            'message': 'Ders veritabanında bulunamadı.'
        }


def clean_instructor_title(name: str) -> str:
    if not name:
        return ''
    cleaned = name.strip()
    pattern = r'^(?:Prof\.?\s*Dr\.?|Prof\.?|Doç\.?\s*Dr\.?|Doç\.?|Doc\.?\s*Dr\.?|Doc\.?|Dr\.?\s*Öğr\.?\s*(?:Üyesi|Üy\.?)|Dr\.?\s*Öğretim\s*Üyesi|Dr\.?|Yrd\.?\s*Doç\.?\s*Dr\.?|Yrd\.?\s*Doç\.?|Öğr\.?\s*Gör\.?\s*Dr\.?|Öğr\.?\s*Gör\.?|Öğretim\s*Görevlisi|Arş\.?\s*Gör\.?\s*Dr\.?|Arş\.?\s*Gör\.?|Arş\.?\s*Grv\.?|Araştırma\s*Görevlisi)\s+'
    while True:
        new_cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE).strip()
        if new_cleaned == cleaned:
            break
        cleaned = new_cleaned
    return cleaned


def _extract_text_and_check_is_new_obs(pdf) -> tuple[bool, str]:
    if not pdf.pages:
        return False, ''
    p0_text = (pdf.pages[0].extract_text() or '')
    lower_text = p0_text.lower()
    is_new = (
        'std_time_table' in lower_text or
        'std_t"me_table' in lower_text or
        ('saat' in lower_text and 'pazartesi' in lower_text and ('dönem:' in lower_text or 'donem:' in lower_text))
    )
    return is_new, p0_text


def parse_new_obs_time_table_pdf(pdf, cursor=None) -> dict:
    p0 = pdf.pages[0]
    text0 = p0.extract_text() or ''

    student_id = ''
    student_name = ''
    department = ''
    term = ''

    for line in text0.split('\n'):
        m_meta = re.match(r'^(\d{7,10})\s+([A-ZÇĞİÖŞÜ\s]+?)\s*\((.*?)\)\s*Dönem:\s*(.*)$', line.strip())
        if m_meta:
            student_id = m_meta.group(1).strip()
            student_name = m_meta.group(2).strip()
            department = m_meta.group(3).strip()
            term = m_meta.group(4).strip()
            break

    # Overflow instructor names from page 2+
    overflow_text = []
    if len(pdf.pages) > 1:
        for p in pdf.pages[1:]:
            p_txt = p.extract_text() or ''
            for l in p_txt.split('\n'):
                l_str = l.strip()
                if l_str and not l_str.startswith('Ders Programı') and 'std_t' not in l_str and 'Sayfa' not in l_str:
                    overflow_text.append(l_str)

    cols = [
        ('Pazartesi', 82.0, 177.5),
        ('Salı', 178.0, 273.5),
        ('Çarşamba', 274.0, 369.1),
        ('Perşembe', 369.5, 464.7),
        ('Cuma', 465.0, 561.0)
    ]
    rows = [
        ('09:00', '09:50', 110.0, 190.6),
        ('10:00', '10:50', 190.6, 272.2),
        ('11:00', '11:50', 272.2, 353.4),
        ('13:00', '13:50', 353.4, 460.6),
        ('14:00', '14:50', 460.6, 567.8),
        ('15:00', '15:50', 567.8, 675.1),
        ('16:00', '16:50', 675.1, 767.9),
        ('17:00', '17:50', 768.0, 858.0)
    ]

    schedule = {d[0]: [] for d in cols}
    schedule['Cumartesi'] = []
    schedule['Pazar'] = []

    for day_name, x0, x1 in cols:
        for start_t, end_t, y0, y1 in rows:
            if y0 >= p0.height:
                continue
            crop = p0.crop((x0, y0, x1, min(y1, p0.height - 2)))
            cell_text = (crop.extract_text() or '').strip()
            if not cell_text:
                continue

            lines = [l.strip() for l in cell_text.split('\n') if l.strip()]
            code_idx = None
            code_match = None
            for idx, l in enumerate(lines):
                m = re.search(r'([A-ZÇĞİÖŞÜ0-9_]{3,10})\((\d+)\)', l)
                if m:
                    code_idx = idx
                    code_match = m
                    break

            if not code_match or code_idx is None:
                continue

            code = code_match.group(1).replace(' ', '').upper()
            sec = code_match.group(2)
            is_lab = ('\uf0c3' in cell_text or '' in cell_text or 'LAB' in cell_text.upper())

            class_idx = None
            classroom = ''
            for idx in range(code_idx + 1, len(lines)):
                m_cls = re.search(r'^(.*?)(?:\[(\d+)\])?$', lines[idx])
                if m_cls and ('[' in lines[idx] or 'online' in lines[idx].lower()):
                    class_idx = idx
                    classroom = m_cls.group(1).strip()
                    break

            if class_idx is not None:
                name_lines = lines[code_idx + 1:class_idx]
                inst_lines = lines[class_idx + 1:]
            else:
                name_lines = lines[code_idx + 1:]
                inst_lines = []

            name = ' '.join(name_lines) if name_lines else code
            instructor = ' '.join(inst_lines)

            # Check if instructor title was cut off at the page edge and needs overflow text
            if overflow_text and any(instructor.rstrip().lower().endswith(t) for t in ['üyesi', 'dr.', 'prof.', 'doç.', 'öğr.gör.']):
                instructor = (instructor + ' ' + ' '.join(overflow_text)).strip()

            instructor = clean_instructor_title(instructor)

            credits_val = 0.0
            ects_val = 0.0
            if cursor:
                cursor.execute(
                    'SELECT name, instructor, credits, ects FROM courses WHERE code = ? LIMIT 1',
                    (code,)
                )
                c_row = cursor.fetchone()
                if c_row:
                    if not name or name == code:
                        name = c_row['name'] or code
                    if not instructor and c_row['instructor']:
                        instructor = clean_instructor_title(c_row['instructor'])
                    credits_val = float(c_row['credits']) if c_row['credits'] is not None else 0.0
                    ects_val = float(c_row['ects']) if c_row['ects'] is not None else 0.0

                cursor.execute(
                    'SELECT instructor FROM sections WHERE course_code = ? AND (section_id = ? OR section_id = ? OR section_id = ?) LIMIT 1',
                    (code, sec, f'Gr{sec}', f'Gr.{sec}')
                )
                sec_db = cursor.fetchone()
                if sec_db and sec_db['instructor'] and not instructor:
                    instructor = clean_instructor_title(sec_db['instructor'])

            schedule[day_name].append({
                'section': sec,
                'code': code,
                'name': name,
                'classroom': classroom,
                'instructor': clean_instructor_title(instructor),
                'start_time': start_t,
                'end_time': end_t,
                'credits': credits_val,
                'ects': ects_val,
                'is_lab': is_lab,
                'is_online': bool(re.search(r'sanal|online|uzaktan|uzem', classroom or '', re.I) or re.search(r'uzaktan', name or '', re.I))
            })

    # Merge consecutive hours for same course block
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
                if len(it['instructor']) > len(merged[-1]['instructor']):
                    merged[-1]['instructor'] = it['instructor']
            else:
                merged.append(it.copy())
        merged_schedule[day] = merged

        for it in merged:
            ckey = (it['code'], it['section'])
            if ckey not in courses_summary_map:
                courses_summary_map[ckey] = {
                    'code': it['code'],
                    'name': it['name'],
                    'credits': it.get('credits', 0.0),
                    'ects': it.get('ects', 0.0),
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
        'department': department,
        'term': term,
        'schedule': merged_schedule,
        'courses_summary': summary_list
    }


def parse_old_usis_schedule_pdf(pdf, cursor=None) -> dict:
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

    item_regex = re.compile(
        r'(\d+)\s+([A-ZÇĞİÖŞÜ0-9_]{2,10})\s+(.*?)\s+(\d{1,2}[\.:]\d{2})\s+(\d{1,2}[\.:]\d{2}u?)'
    )

    for page in pdf.pages:
        text = page.extract_text() or ''
        for line in text.split('\n'):
            if 'Öğrenci Ders Programı' in line or 'renci Ders Program' in line:
                hdr_line = line.strip()
                m_hdr = re.search(r'-\s*([0-9]{4}\s*-\s*[0-9]{4}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)', hdr_line)
                if m_hdr:
                    term = m_hdr.group(1).strip()
                break

        words = page.extract_words()
        day_anchors: Dict[str, tuple[float, float]] = {}
        for w in words:
            w_txt = w['text'].strip()
            if w_txt in schedule and w_txt not in day_anchors:
                day_anchors[w_txt] = (float(w['x0']), float(w['top']))

        row_split_y = day_anchors['Cuma'][1] - 12.0 if 'Cuma' in day_anchors else 300.0
        top_cut_y = (min(v[1] for v in day_anchors.values()) - 10.0) if day_anchors else 80.0

        vlines = sorted(list(set(
            round(l['x0'], 1) for l in page.lines
            if abs(l['x0'] - l['x1']) < 1.0 and (l.get('top', 0) < 200 or l.get('bottom', 0) < 200)
        )))

        divider_groups = []
        for vx in [x for x in vlines if 150 < x < 750]:
            if not divider_groups or abs(vx - divider_groups[-1][-1]) > 15.0:
                divider_groups.append([vx])
            else:
                divider_groups[-1].append(vx)

        if len(divider_groups) >= 3:
            c1 = (divider_groups[0][0] + divider_groups[0][-1]) / 2.0
            c2 = (divider_groups[1][0] + divider_groups[1][-1]) / 2.0
            c3 = (divider_groups[2][0] + divider_groups[2][-1]) / 2.0
        else:
            sb_x_list = sorted(list(set(
                round(w['x0'], 1) for w in words
                if 70 < w['top'] < 100 and ('b' in w['text'] or 'Şb' in w['text'] or 'Sb' in w['text'])
            )))
            if len(sb_x_list) >= 4:
                c1 = (sb_x_list[0] + sb_x_list[1]) / 2.0 + 45.0
                c2 = (sb_x_list[1] + sb_x_list[2]) / 2.0 + 45.0
                c3 = (sb_x_list[2] + sb_x_list[3]) / 2.0 + 45.0
            else:
                c1, c2, c3 = 225.0, 425.0, 625.0

        rows: Dict[float, list] = {}
        for w in words:
            if w['top'] < top_cut_y and 'Pazartesi' not in w['text']:
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
            is_upper_half = y_val < row_split_y
            col_bounds = [
                (0.0, c1, 'Pazartesi' if is_upper_half else 'Cuma'),
                (c1, c2, 'Salı' if is_upper_half else 'Cumartesi'),
                (c2, c3, 'Çarşamba' if is_upper_half else 'Pazar'),
                (c3, 1200.0, 'Perşembe' if is_upper_half else None),
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
                    credits_val = 0.0
                    ects_val = 0.0

                    if cursor:
                        cursor.execute(
                            'SELECT name, instructor, credits, ects FROM courses WHERE code = ? LIMIT 1',
                            (code,)
                        )
                        c_row = cursor.fetchone()
                        if c_row:
                            course_name = c_row['name']
                            instructor = clean_instructor_title(c_row['instructor'] or '')
                            credits_val = float(c_row['credits']) if c_row['credits'] is not None else 0.0
                            ects_val = float(c_row['ects']) if c_row['ects'] is not None else 0.0

                        cursor.execute(
                            'SELECT instructor FROM sections WHERE course_code = ? AND (section_id = ? OR section_id = ? OR section_id = ?) LIMIT 1',
                            (code, sec_no, f'Gr{sec_no}', f'Gr.{sec_no}')
                        )
                        sec_db = cursor.fetchone()
                        if sec_db and sec_db['instructor']:
                            instructor = clean_instructor_title(sec_db['instructor'])

                    schedule[target_day].append({
                        'section': sec_no,
                        'code': code,
                        'name': course_name,
                        'classroom': classroom.strip(),
                        'instructor': clean_instructor_title(instructor),
                        'start_time': start_t_clean,
                        'end_time': end_t_clean,
                        'credits': credits_val,
                        'ects': ects_val,
                        'is_lab': 'LAB' in classroom.upper(),
                        'is_online': bool(re.search(r'sanal|online|uzaktan|uzem', classroom or '', re.I) or re.search(r'uzaktan', course_name or '', re.I))
                    })

    # Merge consecutive hours for same course block
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
                    'credits': it.get('credits', 0.0),
                    'ects': it.get('ects', 0.0),
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
        'term': term,
        'schedule': merged_schedule,
        'courses_summary': summary_list
    }


@app.post('/api/parse-student-schedule')
def parse_student_schedule_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Lütfen geçerli bir PDF dosyası yükleyin.')

    tmp_path = _save_upload_to_tempfile(file, suffix='.pdf')

    try:
        conn = _get_db_connection()
        cursor = conn.cursor() if conn else None

        with pdfplumber.open(tmp_path) as pdf:
            is_new, _ = _extract_text_and_check_is_new_obs(pdf)
            if is_new:
                result = parse_new_obs_time_table_pdf(pdf, cursor=cursor)
            else:
                result = parse_old_usis_schedule_pdf(pdf, cursor=cursor)

        if conn:
            conn.close()

        total_courses = sum(len(v) for v in result.get('schedule', {}).values())
        if total_courses == 0:
            raise HTTPException(
                status_code=400,
                detail="Yüklenen dosya geçerli bir YTÜ ders programı içermiyor veya hiç ders bulunamadı. Lütfen OBS'den 'Detay Yazdır > PDF' ile indirdiğiniz resmi ders programını yükleyin."
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF ayrıştırılırken hata oluştu: {str(e)}')
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Durum Makineli & Kalibre Geometrik Izgara PNG / Gorsel Ayrıştırıcı
# ---------------------------------------------------------------------------

ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
DAY_INDEX_MAP = {'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4}

STANDARD_HOURS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]
NUM_STANDARD_HOURS = len(STANDARD_HOURS)

COURSE_CODE_RE = re.compile(r'([A-ZÇĞİÖŞÜ]{2,5}\s*\d{3,4}[A-Z]?)')


def _match_day_name(raw_str: str) -> Optional[str]:
    s = raw_str.lower().translate(str.maketrans('İıŞşÇçĞğÖöÜü', 'iissccggoouu'))
    if re.search(r'pazar.*tesi|pzr.*tes|pzt|pazarte', s):
        return 'Pazartesi'
    if re.search(r'sal[i1!l]', s):
        return 'Salı'
    if re.search(r'c[a-z]*r[s]am|car[s]|crs', s):
        return 'Çarşamba'
    if re.search(r'per[s]em|prs', s):
        return 'Perşembe'
    if re.search(r'cum[a-z]*tesi|cmt', s):
        return 'Cumartesi'
    if re.search(r'cum[a!]', s):
        return 'Cuma'
    if re.search(r'pazar', s):
        return 'Pazar'
    return None


def _is_course_header(txt: str) -> bool:
    if re.search(r'^(EEF|SEF|FEF|MED|İİBF|CEV|MİM|KMB|LAB|Online)-', txt, re.IGNORECASE):
        return False
    if re.search(r'\(\s*.*?[ŞSşs5gbG$§].*?\d+', txt, re.IGNORECASE):
        return True
    if re.search(r'\b[A-ZÇĞİÖŞÜ]{2,5}\s*\d{3,4}[A-Z]?\b', txt):
        return True
    return False


def _ocr_words_data(image, lang: str = 'tur+eng') -> List[dict]:
    import pytesseract
    try:
        raw = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
    except Exception:
        raw = pytesseract.image_to_data(image, lang='eng', output_type=pytesseract.Output.DICT)

    words = []
    for i, txt in enumerate(raw.get('text', [])):
        txt = (txt or '').strip()
        if txt:
            left = raw['left'][i]
            top = raw['top'][i]
            w = raw['width'][i]
            h = raw['height'][i]
            words.append({
                'text': txt,
                'left': left,
                'top': top,
                'w': w,
                'h': h,
                'cx': left + w / 2,
                'cy': top + h / 2,
            })
    return words


def parse_schedule_image_ytu(image) -> dict:
    words = _ocr_words_data(image)
    if not words:
        raise ValueError('Görselde OCR kelimesi bulunamadı.')

    img_w = image.width
    img_h = image.height

    # 1. Gün Sütunlarını Tespit Et (Üst %40)
    header_limit = min(int(img_h * 0.40), 400)
    header_words = [w for w in words if w['top'] < header_limit]

    detected_days = {}
    for w in header_words:
        d = _match_day_name(w['text'])
        if d and d not in detected_days:
            detected_days[d] = {
                'day': d,
                'cx': w['cx'],
                'top': w['top'],
                'bottom': w['top'] + w['h'],
            }

    detected_entries = sorted(detected_days.values(), key=lambda x: x['cx'])
    day_cols = {}

    if len(detected_entries) >= 2:
        first = detected_entries[0]
        last = detected_entries[-1]
        first_idx = DAY_INDEX_MAP.get(first['day'], 0)
        last_idx = DAY_INDEX_MAP.get(last['day'], 4)
        col_width = (last['cx'] - first['cx']) / max(1, last_idx - first_idx)

        for idx, day in enumerate(WEEKDAYS):
            cx = first['cx'] + (idx - first_idx) * col_width
            day_cols[day] = {
                'cx': cx,
                'xmin': max(0.0, cx - col_width / 2),
                'xmax': min(float(img_w), cx + col_width / 2),
            }
    else:
        left_margin = img_w * 0.14
        col_width = (img_w - left_margin) / 5
        for idx, day in enumerate(WEEKDAYS):
            cx = left_margin + (idx + 0.5) * col_width
            day_cols[day] = {
                'cx': cx,
                'xmin': left_margin + idx * col_width,
                'xmax': left_margin + (idx + 1) * col_width,
            }

    header_bottom = max((d['bottom'] for d in detected_entries), default=img_h * 0.12)

    # 2. Sol Saat Etiketlerinden Y Doğrusal Regresyonu
    first_col_xmin = day_cols.get('Pazartesi', {}).get('xmin', img_w * 0.15)
    left_hour_words = [w for w in words if w['cx'] < first_col_xmin + 15 and w['top'] > header_bottom]

    hour_detections = []
    for w in left_hour_words:
        m = re.search(r'(\d{1,2})[:.](\d{2})', w['text'])
        if m:
            h = int(m.group(1))
            if 8 <= h <= 20:
                hour_detections.append({'hour': h, 'y': w['cy']})

    row_height = 48.0
    row0_center = header_bottom + 25.0
    max_detected_hour = max((d['hour'] for d in hour_detections), default=18)
    active_slots = 13 if max_detected_hour >= 19 else 11

    if len(hour_detections) >= 2:
        h0 = hour_detections[0]
        hN = hour_detections[-1]
        if hN['hour'] != h0['hour']:
            row_height = (hN['y'] - h0['y']) / (hN['hour'] - h0['hour'])
            row0_center = h0['y'] - (h0['hour'] - 8) * row_height
    else:
        body_words_tmp = [w for w in words if w['top'] > header_bottom]
        body_bottom = max((w['top'] + w['h'] for w in body_words_tmp), default=img_h * 0.9)
        row_height = (body_bottom - header_bottom) / active_slots
        row0_center = header_bottom + row_height / 2

    body_words = [w for w in words if w['top'] > header_bottom]
    schedule: Dict[str, list] = {d: [] for d in ALL_DAYS}

    conn = _get_db_connection()
    cursor = conn.cursor() if conn else None

    try:
        # 3. Her Gün Sütunundaki Saatleri Eşle
        for day in WEEKDAYS:
            col = day_cols.get(day)
            if not col:
                continue

            col_wds = [
                w for w in body_words
                if (col['xmin'] + 5) <= w['cx'] < (col['xmax'] - 5)
                and (len(w['text']) >= 3 or re.search(r'\d', w['text']) or re.search(r'şb|sb|gr|lab', w['text'], re.I))
            ]
            if not col_wds:
                continue

            words_in_hour: List[List[dict]] = [[] for _ in range(active_slots)]
            for w in col_wds:
                h_idx = max(0, min(active_slots - 1, int((w['cy'] - row0_center + row_height * 0.45) // row_height)))
                words_in_hour[h_idx].append(w)

            card_list = []
            cur_card = None

            for h in range(active_slots):
                wds = words_in_hour[h]
                has_words = len(wds) > 0
                text = ' '.join(w['text'] for w in wds)
                is_header = _is_course_header(text)

                if has_words:
                    if cur_card is None:
                        cur_card = {'start': h, 'end': h, 'words': list(wds)}
                    elif is_header and h > cur_card['start'] and (h - cur_card['start'] >= 2):
                        card_list.append(cur_card)
                        cur_card = {'start': h, 'end': h, 'words': list(wds)}
                    else:
                        cur_card['end'] = h
                        cur_card['words'].extend(wds)
                else:
                    if cur_card is not None:
                        next_wds = words_in_hour[h + 1] if h + 1 < active_slots else []
                        next_has = len(next_wds) > 0
                        next_is_hdr = _is_course_header(' '.join(w['text'] for w in next_wds))

                        if next_has and not next_is_hdr and (h + 1 - cur_card['start'] <= 2):
                            continue
                        else:
                            card_list.append(cur_card)
                            cur_card = None

            if cur_card is not None:
                card_list.append(cur_card)

            # Bitişik eksik parçaları birleştir
            merged_cards = []
            for card in card_list:
                if not merged_cards:
                    merged_cards.append(card)
                    continue
                prev = merged_cards[-1]
                prev_len = prev['end'] - prev['start'] + 1
                card_len = card['end'] - card['start'] + 1

                if card['start'] == prev['end'] + 1 and (prev_len == 1 or card_len == 1) and (card['end'] - prev['start'] + 1 <= 3):
                    prev['end'] = card['end']
                    prev['words'].extend(card['words'])
                else:
                    merged_cards.append(card)

            for card in merged_cards:
                h_start = int(STANDARD_HOURS[card['start']].split(':')[0])
                h_end = int(STANDARD_HOURS[card['end']].split(':')[0])

                start_t = f"{h_start:02d}:00"
                end_t = f"{h_end:02d}:50"

                card_text = ' '.join(w['text'] for w in card['words'])
                cm = COURSE_CODE_RE.search(card_text)
                if not cm:
                    continue
                code = cm.group(1).replace(' ', '').upper()

                course_name = code
                credits_val = 0.0
                ects_val = 0.0
                if cursor:
                    cursor.execute(
                        'SELECT name, credits, ects FROM courses WHERE UPPER(REPLACE(code, " ", "")) = ? LIMIT 1',
                        (code,)
                    )
                    c_row = cursor.fetchone()
                    if c_row:
                        course_name = c_row['name'] or code
                        credits_val = float(c_row['credits']) if c_row['credits'] is not None else 0.0
                        ects_val = float(c_row['ects']) if c_row['ects'] is not None else 0.0

                schedule[day].append({
                    'section': '1',
                    'code': code,
                    'name': course_name,
                    'classroom': '',
                    'instructor': '',
                    'start_time': start_t,
                    'end_time': end_t,
                    'credits': credits_val,
                    'ects': ects_val,
                    'is_lab': False,
                })
    finally:
        if conn:
            conn.close()

    # Aynı dersin farklı gün/saat bloklarını tek bir özet kaydında birleştir (PDF parser ile birebir uyumlu)
    summary_map = {}
    for day, items in schedule.items():
        for it in items:
            key = (it['code'], it['section'])
            if key not in summary_map:
                summary_map[key] = {
                    'code': it['code'],
                    'name': it['name'],
                    'credits': it.get('credits', 0.0),
                    'ects': it.get('ects', 0.0),
                    'section': it['section'],
                    'instructor': it.get('instructor', ''),
                    'classrooms': [],
                    'time_slots': []
                }
            summary_map[key]['time_slots'].append({
                'day': day,
                'start_time': it['start_time'],
                'end_time': it['end_time'],
                'classroom': it.get('classroom', ''),
                'is_lab': it.get('is_lab', False),
            })

    total_courses = sum(len(v) for v in schedule.values())
    if total_courses == 0:
        raise ValueError('Görselde ders programı tespit edilemedi.')

    return {
        'status': 'success',
        'term': 'Aktif Dönem',
        'schedule': schedule,
        'courses_summary': list(summary_map.values()),
    }


@app.post('/api/parse-schedule-file')
def parse_schedule_file_endpoint(file: UploadFile = File(...)):
    filename = (file.filename or '').lower()
    if filename.endswith('.pdf'):
        return parse_student_schedule_endpoint(file)
    elif filename.endswith(('.png', '.jpg', '.jpeg')):
        from PIL import Image

        tmp_path = _save_upload_to_tempfile(file, suffix='.png')

        try:
            with Image.open(tmp_path) as img:
                # 1. PNG metadata (tEXt chunk) kontrol et
                raw_meta = img.info.get('schedule_data') or img.info.get('ptu_schedule')
                if raw_meta:
                    try:
                        data = json.loads(raw_meta)
                        if data and data.get('schedule'):
                            data.pop('student_id', None)
                            data.pop('student_name', None)
                            data.pop('title', None)
                            return data
                    except Exception:
                        pass

                # 2. Metadata yoksa Çift Stratejili OCR ile ayrıştır
                try:
                    data = parse_schedule_image_ytu(img)
                    total = sum(len(v) for v in data.get('schedule', {}).values())
                    if total > 0:
                        return data
                except Exception as ocr_err:
                    print('Backend OCR error:', ocr_err)

            raise HTTPException(
                status_code=400,
                detail='Görseldeki ders saatleri okunamadı. Lütfen görselin net olduğundan veya Report.pdf yüklediğinizden emin olun.'
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Görsel işleme hatası: {str(e)}')
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    else:
        raise HTTPException(status_code=400, detail='Lütfen geçerli bir PDF veya PNG/JPG görseli yükleyin.')


@app.post('/api/parse-transcript')
def parse_transcript(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail='Sadece PDF formatında transkript yükleyebilirsiniz.')

    tmp_path = _save_upload_to_tempfile(file, suffix='.pdf')

    try:
        text = ""
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

        cgpa = None
        total_credits = None

        # 1. YTU Orijinal Format
        ytu_cgpa = re.search(r'\(AGNO\)\s*:\s*([\d.,]+)', text)
        ytu_credits = re.search(r'Tamamlanan Yerel Kredi Say\S*\s*:\s*([\d.,]+)', text)

        # 2. e-Devlet Format
        edev_cgpa = re.search(r'GNO\s*:\s*([\d.,]+)', text)
        if not edev_cgpa:
            edev_cgpa = re.search(r'\(Cumulative GPA\)\s*[\n:]*\s*([\d.,]+)', text)

        edev_credits = re.search(r'TUK\s*:\s*([\d.,]+)', text)
        if not edev_credits:
            edev_credits = re.search(r'\(Credits Completed\)\s*[\n:]*\s*([\d.,]+)', text)

        if ytu_cgpa:
            cgpa = ytu_cgpa.group(1).replace(',', '.')
        elif edev_cgpa:
            cgpa = edev_cgpa.group(1).replace(',', '.')

        if ytu_credits:
            total_credits = ytu_credits.group(1).replace(',', '.')
        elif edev_credits:
            total_credits = edev_credits.group(1).replace(',', '.')

        # Dersleri parse etme (Geçmiş durum tablosu ve Akademik Planlama için)
        courses = []
        valid_grades = [
            'AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD', 'FF', 'F0',
            'G', 'K', 'M', 'MU', 'BL', 'EX', 'İ', '--'
        ]

        current_term = ""
        lines = text.split('\n')
        for idx, line in enumerate(lines):
            line = line.strip()

            # Dönem başlığını yakala
            term_match = re.match(r'^20\d{2}-20\d{2}\s+([Gg].z|[Bb]ahar|[Yy]az|[Mm]uaf|[İiI]ntibak)', line)
            if term_match:
                term_parts = line.split()
                if len(term_parts) >= 2:
                    current_term = f"{term_parts[0]} {term_parts[1].capitalize()}"
            elif re.search(r'(Muafiyet|İntibak)\s+Dönemi', line, re.IGNORECASE):
                current_term = "Muafiyet"

            # Örn: MAT1071, İSG1811 veya *TIB1000 ile başlayan satırlar
            code_match = re.match(r'^(\*?[A-ZÇĞİÖŞÜ]{2,6}\s?\d{3,4}[A-Z]?)\s+', line)
            if not code_match:
                continue

            code = re.sub(r'\s+', '', code_match.group(1).replace('*', '')).upper()
            parts = line.split()

            best_grade = None
            best_grade_idx = -1
            max_numbers_before = -1

            for i in range(len(parts) - 1, 0, -1):
                if parts[i] in valid_grades:
                    num_count = 0
                    for j in range(i - 1, 0, -1):
                        if re.match(r'^\d+(,\d+)?(\.\d+)?$', parts[j]):
                            num_count += 1
                        else:
                            break
                    if num_count > max_numbers_before:
                        max_numbers_before = num_count
                        best_grade = parts[i]
                        best_grade_idx = i

            if best_grade is None:
                continue

            grade = best_grade if best_grade != '--' else ''
            grade_idx = best_grade_idx

            # Notun hemen oncesindeki sayisal degerleri (AKTS, Kredi, U, T) topla
            numbers_before_grade = []
            for i in range(grade_idx - 1, 0, -1):
                if re.match(r'^\d+(,\d+)?(\.\d+)?$', parts[i]):
                    numbers_before_grade.append(parts[i].replace(',', '.'))
                else:
                    break

            if len(numbers_before_grade) >= 2:
                credit_str = numbers_before_grade[1]
            elif len(numbers_before_grade) == 1:
                credit_str = numbers_before_grade[0]
            else:
                credit_str = "0"

            # Ders Adı Çıkarımı
            name_parts = []
            for i in range(1, grade_idx - len(numbers_before_grade)):
                if parts[i] not in ['TR', 'EN', 'Z', 'S', 'İng.', 'Türkçe', 'Tr']:
                    name_parts.append(parts[i])

            name = " ".join(name_parts).strip()

            # Eğer isim boş kaldıysa veya çok kısaysa, pdfplumber ders adını bir önceki ve bir sonraki satıra bölmüş olabilir
            if len(name) < 3 and idx > 0:
                prev_line = lines[idx - 1].strip()
                if prev_line and not re.match(r'^(\*?[A-ZÇĞİÖŞÜ]{2,6}\s?\d{3,4}|20\d{2}-20\d{2}|Ders\s+Kodu)', prev_line, re.I):
                    name = prev_line
                    if idx + 1 < len(lines):
                        next_line = lines[idx + 1].strip()
                        if (
                            next_line and
                            len(next_line) < 45 and
                            not re.match(r'^(\*?[A-ZÇĞİÖŞÜ]{2,6}\s?\d{3,4}|20\d{2}-20\d{2}|AGNO|GNO|TUK|Toplam)', next_line, re.I)
                        ):
                            name = f"{name} {next_line}".strip()

            if not name:
                name = "Bilinmeyen Ders"

            courses.append({
                "code": code,
                "name": name,
                "credits": float(credit_str) if credit_str else 0,
                "expectedGrade": grade,
                "term": current_term
            })

        # Aynı kodlu derslerin son alınanını tut (Transkript kronolojiktir)
        course_dict = {}
        for c in courses:
            course_dict[c['code']] = c

        final_courses = list(course_dict.values())

        # Transkriptteki ders kodları ve başlık metninden Fakülte & Bölüm tespiti
        detected_faculty = None
        detected_program_id = None
        detected_program_name = None
        try:
            curricula_data = _load_curricula()
            transcript_codes = {c['code'] for c in final_courses}
            dept_codes = {
                code for code in transcript_codes
                if not code.startswith(('ATA', 'TDB', 'MDB', 'YDB', 'ISG', 'İSG'))
            }
            text_lower = text.lower()
            best_score = 0
            for fac in curricula_data.get('faculties', []):
                for prog in fac.get('programs', []):
                    p_name = prog.get('name', '')
                    base_dept = p_name.split('Lisans Programı')[0].strip().lower()
                    sem_courses = [
                        c.get('code', '').upper()
                        for s_list in (prog.get('semesters') or {}).values()
                        for c in s_list
                    ]
                    comp_set = set(sem_courses)
                    overlap = len(dept_codes & comp_set)
                    score = overlap * 3
                    if base_dept and len(base_dept) > 4 and base_dept in text_lower:
                        score += 15
                    if '%100' in p_name and ('%100' in text_lower or '(ingilizce)' in text_lower or '100% english' in text_lower):
                        score += 2
                    elif '%30' in p_name and ('%30' in text_lower or '30% english' in text_lower):
                        score += 2
                    if score > best_score and (overlap >= 2 or score >= 15):
                        best_score = score
                        detected_faculty = fac.get('faculty')
                        detected_program_id = str(prog.get('id'))
                        detected_program_name = p_name
        except Exception:
            pass

        return {
            "status": "success",
            "cgpa": float(cgpa) if cgpa else 0.0,
            "total_credits": float(total_credits) if total_credits else 0.0,
            "courses": final_courses,
            "detected_faculty": detected_faculty,
            "detected_program_id": detected_program_id,
            "detected_program_name": detected_program_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Transkript okunurken hata: {str(e)}')
    finally:
        # KVKK Güvencesi: Hata veya bağlantı kopması (CancelledError) durumunda bile geçici PDF dosyasını kesin imha et
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Uygun Musun? - Çoklu Profil Program & Canlı Durum Senkronizasyon Uç Noktaları
# ---------------------------------------------------------------------------

@app.post('/api/uygun-musun/create-room')
def create_uygun_musun_room(payload: Dict[str, Any] = Body(...)):
    title = str(payload.get('title') or 'Kampüs Lobisi').strip()
    profile = payload.get('profile') or {}
    device_token = str(payload.get('device_token') or '')
    if not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail='Geçerli bir profil bilgisi gerekli.')
    try:
        return uygun_musun_store.create_room(title, profile, device_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Lobi oluşturulamadı: {str(e)}')


@app.post('/api/uygun-musun/join')
def join_uygun_musun_room(payload: Dict[str, Any] = Body(...)):
    room_code = str(payload.get('room_code') or '').strip()
    profile = payload.get('profile') or {}
    device_token = str(payload.get('device_token') or '')
    if not room_code:
        raise HTTPException(status_code=400, detail='Lobi kodu zorunludur.')
    if not isinstance(profile, dict):
        raise HTTPException(status_code=400, detail='Geçerli bir profil bilgisi gerekli.')
    try:
        res = uygun_musun_store.join_room(room_code, profile, device_token)
        # Lobiye yeni biri katıldığında diğer üyelere bildirim gönder
        joined_name = str(profile.get('name') or 'Yeni Üye')
        my_pid = res.get('my_profile_id') or ''
        room_title = res.get('title') or 'Lobi'
        if my_pid:
            uygun_musun_store.send_push_notification_to_room(
                res['room_code'],
                my_pid,
                f"🎉 {joined_name} lobiye katıldı!",
                f"{joined_name}, '{room_title}' lobisine programını ekledi.",
                f"/uygun-musun?join={res['room_code'].upper()}"
            )
        return res
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Lobiye katılınamadı: {str(e)}')


@app.post('/api/uygun-musun/my-rooms')
def get_my_uygun_musun_rooms(payload: Dict[str, Any] = Body(...)):
    room_codes = payload.get('room_codes') or []
    if not isinstance(room_codes, list):
        raise HTTPException(status_code=400, detail='room_codes listesi gerekli.')
    try:
        rooms = uygun_musun_store.get_my_rooms_summary([str(c) for c in room_codes])
        return {'rooms': rooms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Lobiler alınamadı: {str(e)}')


@app.patch('/api/uygun-musun/room/{room_code}')
def update_uygun_musun_room_meta(room_code: str, payload: Dict[str, Any] = Body(...)):
    new_title = str(payload.get('title') or '').strip()
    try:
        return uygun_musun_store.update_room_title(room_code, new_title)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Lobi güncellenemedi: {str(e)}')


@app.get('/api/uygun-musun/room/{room_code}')
def get_uygun_musun_room(room_code: str, strict: bool = False):
    try:
        return uygun_musun_store.get_room(room_code, create_if_missing=not strict)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Oda bilgisi alınamadı: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/profile')
def upsert_uygun_musun_profile(room_code: str, payload: Dict[str, Any] = Body(...)):
    try:
        return uygun_musun_store.upsert_profile(room_code, payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Profil kaydedilemedi: {str(e)}')


@app.get('/api/uygun-musun/vapid-public-key')
def get_uygun_musun_vapid_key():
    return {'public_key': uygun_musun_store.VAPID_PUBLIC_KEY}


@app.post('/api/uygun-musun/room/{room_code}/status')
def update_uygun_musun_status(
    room_code: str,
    payload: Dict[str, Any] = Body(...),
    profile_id: Optional[str] = None
):
    target_profile = str(payload.get('profile_id') or profile_id or '').strip()
    if not target_profile:
        raise HTTPException(status_code=400, detail='profile_id alanı zorunludur.')

    custom_status = payload.get('custom_status') if 'custom_status' in payload else payload
    # Eğer payload sadece durum objesiyse ve profile_id query param geldiyse
    if isinstance(custom_status, dict) and 'profile_id' in custom_status and len(custom_status) == 1:
        custom_status = None

    try:
        res = uygun_musun_store.update_profile_status(room_code, target_profile, custom_status)

        # Durum değiştiğinde odadaki diğer üyelere Push bildirimi gönder
        if custom_status and isinstance(custom_status, dict):
            profiles = res.get('profiles', [])
            sender_obj = next((p for p in profiles if p.get('id') == target_profile), None)
            sender_name = (
                sender_obj.get('name')
                if sender_obj
                else ('Atilla' if target_profile == 'atilla' else 'Neva' if target_profile == 'neva' else target_profile)
            )

            if custom_status.get('early_exit'):
                uygun_musun_store.send_push_notification_to_room(
                    room_code,
                    target_profile,
                    f"⚡ {sender_name} dersten erken çıktı!",
                    custom_status.get('note') or f"{sender_name} şu an müsait! 🎉",
                )
            elif custom_status.get('note') or custom_status.get('label'):
                emoji = custom_status.get('emoji') or '📍'
                label = custom_status.get('label') or 'Durum'
                note = custom_status.get('note') or ''
                uygun_musun_store.send_push_notification_to_room(
                    room_code,
                    target_profile,
                    f"{emoji} {sender_name}: {label}",
                    note or f"{sender_name} durumunu güncelledi.",
                )

        return res
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Durum güncellenemedi: {str(e)}')


@app.delete('/api/uygun-musun/room/{room_code}/profile/{profile_id}')
def delete_uygun_musun_profile(room_code: str, profile_id: str):
    try:
        return uygun_musun_store.delete_profile(room_code, profile_id)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Profil silinemedi: {str(e)}')


@app.delete('/api/uygun-musun/room/{room_code}')
def delete_uygun_musun_room(
    room_code: str,
    profile_id: Optional[str] = None,
    admin_token: Optional[str] = None,
):
    try:
        return uygun_musun_store.delete_room(
            room_code,
            admin_token=admin_token,
            requester_profile_id=profile_id,
        )
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Lobi kapatılamadı: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/ping')
def send_uygun_musun_ping(room_code: str, payload: Dict[str, Any] = Body(...)):
    from_id = str(payload.get('from_id') or '').strip()
    to_id = str(payload.get('to_id') or 'all').strip()
    ping_type = str(payload.get('type') or 'coffee')
    message = str(payload.get('message') or '')
    emoji = str(payload.get('emoji') or '☕')
    if not from_id or not to_id:
        raise HTTPException(status_code=400, detail='from_id ve to_id zorunludur.')
    try:
        res = uygun_musun_store.send_ping(room_code, from_id, to_id, ping_type, message, emoji)

        profiles = res.get('profiles', [])
        sender_obj = next((p for p in profiles if p.get('id') == from_id), None)
        sender_name = (
            sender_obj.get('name')
            if sender_obj
            else ('Atilla' if from_id == 'atilla' else 'Neva' if from_id == 'neva' else from_id)
        )
        room_title = res.get('title') or 'Lobi'

        if to_id == 'all':
            # Gruba Genel Seslen (Broadcast Ping)
            push_title = f"{emoji} {sender_name} ({room_title})"
            push_body = message or f"{sender_name} gruba seslendi!"
            uygun_musun_store.send_push_notification_to_room(
                room_code,
                from_id,
                push_title,
                push_body,
            )
        else:
            # Bireysel Dürtme / Çağrı
            if ping_type == 'poke':
                push_title = f"👉 {sender_name} seni dürttü!"
                push_body = message or f"{sender_name}: 'Dersin bitti mi, ne yapıyorsun?'"
            elif ping_type == 'coffee':
                push_title = f"☕ {sender_name} ile Kahve Vakti?"
                push_body = message or f"{sender_name}: 'Orta bahçede bir kahve içelim mi?'"
            elif ping_type == 'lunch':
                push_title = f"🍕 {sender_name} ile Yemek?"
                push_body = message or f"{sender_name}: 'Acıktım, bir şeyler yiyelim mi?'"
            elif ping_type == 'free':
                push_title = f"⚡ {sender_name} Müsait!"
                push_body = message or f"{sender_name} şu an tamamen boşaldı!"
            else:
                push_title = f"{emoji} {sender_name}'dan Bildirim"
                push_body = message or f"{sender_name} sana bildirim bıraktı."

            uygun_musun_store.send_push_notification_to_profile(
                room_code,
                to_id,
                push_title,
                push_body,
            )

        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Ping gönderilemedi: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/ping/{ping_id}/dismiss')
def dismiss_uygun_musun_ping(
    room_code: str,
    ping_id: str,
    profile_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = Body(default=None)
):
    pid = str((payload or {}).get('profile_id') or profile_id or '').strip() or None
    try:
        return uygun_musun_store.dismiss_ping(room_code, ping_id, pid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Ping kapatılamadı: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/subscribe')
def subscribe_push(room_code: str, payload: Dict[str, Any] = Body(...)):
    profile_id = str(payload.get('profile_id') or '').strip()
    sub = payload.get('subscription')
    if not profile_id or not sub or not isinstance(sub, dict):
        raise HTTPException(status_code=400, detail='profile_id ve subscription zorunludur.')
    try:
        return uygun_musun_store.save_push_subscription(room_code, profile_id, sub)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Bildirim aboneliği kaydedilemedi: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/unsubscribe')
def unsubscribe_push(room_code: str, payload: Dict[str, Any] = Body(...)):
    endpoint = str(payload.get('endpoint') or '').strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail='endpoint zorunludur.')
    try:
        uygun_musun_store.remove_push_subscription(endpoint)
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Abonelik silinemedi: {str(e)}')


@app.post('/api/uygun-musun/room/{room_code}/test-push')
def test_push_notification(room_code: str, payload: Dict[str, Any] = Body(...)):
    profile_id = str(payload.get('profile_id') or '').strip()
    if not profile_id:
        raise HTTPException(status_code=400, detail='profile_id zorunludur.')
    try:
        room = uygun_musun_store.get_room(room_code)
        sender_obj = next((p for p in room.get('profiles', []) if p.get('id') == profile_id), None)
        sender_name = (
            sender_obj.get('name')
            if sender_obj
            else ('Atilla' if profile_id == 'atilla' else 'Neva' if profile_id == 'neva' else 'Dostum')
        )
        uygun_musun_store.send_push_notification_to_profile(
            room_code,
            profile_id,
            "🔔 Bildirimler Başarıyla Bağlandı!",
            f"Tebrikler {sender_name}! Artık erken çıkışlar ve grup çağrıları kilit ekranına düşecek.",
        )
        return {'success': True, 'message': 'Test bildirimi gönderildi.'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Test bildirimi gönderilemedi: {str(e)}')


# ---------------------------------------------------------------------------
# Cihazlar Arası Senkronizasyon (Device Sync & Ephemeral Transfer) Endpoints
# ---------------------------------------------------------------------------

@app.post('/api/sync/save')
def sync_save_endpoint(payload: Dict[str, Any] = Body(...)):
    student_id = str(payload.get('student_id') or '').strip()
    pin = str(payload.get('pin') or '').strip()
    data = payload.get('payload')

    if not student_id or not pin:
        raise HTTPException(status_code=400, detail='Öğrenci numarası ve PIN zorunludur.')
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail='Kaydedilecek veri (payload) geçerli bir obje olmalıdır.')

    try:
        return uygun_musun_store.save_sync_account(student_id, pin, data)
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Yedekleme hatası: {str(e)}')


@app.post('/api/sync/load')
def sync_load_endpoint(payload: Dict[str, Any] = Body(...)):
    student_id = str(payload.get('student_id') or '').strip()
    pin = str(payload.get('pin') or '').strip()

    if not student_id or not pin:
        raise HTTPException(status_code=400, detail='Öğrenci numarası ve PIN zorunludur.')

    try:
        return uygun_musun_store.load_sync_account(student_id, pin)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Geri yükleme hatası: {str(e)}')


@app.post('/api/sync/transfer/create')
def sync_transfer_create_endpoint(payload: Dict[str, Any] = Body(...)):
    data = payload.get('payload')
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail='Aktarılacak veri (payload) geçerli bir obje olmalıdır.')

    try:
        return uygun_musun_store.create_ephemeral_transfer(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Transfer oluşturulamadı: {str(e)}')


@app.get('/api/sync/transfer/{code}')
def sync_transfer_claim_endpoint(code: str):
    try:
        return uygun_musun_store.claim_ephemeral_transfer(code)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Transfer alma hatası: {str(e)}')





