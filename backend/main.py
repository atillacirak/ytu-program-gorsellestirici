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

@app.api_route('/', methods=['GET', 'HEAD'])
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


# ---------------------------------------------------------------------------
# Coklu-Strateji PNG / Gorsel Ayrıştırıcı (Istemci Tesseract.js ile senkron)
# ---------------------------------------------------------------------------

ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
DAY_INDEX_MAP = {'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4}

TIME_RANGE_RE = re.compile(r'(\d{1,2})[\s.:](\d{2})\s*[-–~to/]\s*(\d{1,2})[\s.:](\d{2})')
SINGLE_TIME_RE = re.compile(r'^(\d{1,2})[\s.:](\d{2})$')
COURSE_CODE_RE = re.compile(r'([A-Za-zÇĞİÖŞÜçğıöşü]{2,6}\s*\d{3,6})')

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

def _to_minutes(time_str: str) -> int:
    parts = time_str.replace('.', ':').split(':')
    h = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
    m = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    return h * 60 + m

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
    body_words = [w for w in words if w['top'] > header_bottom]

    schedule: Dict[str, list] = {d: [] for d in ALL_DAYS}

    # STRATEJİ 1: Sütun İçinde Doğrudan Saat Aralığı Tespiti
    for day in WEEKDAYS:
        col = day_cols.get(day)
        if not col:
            continue
        col_wds = [w for w in body_words if col['xmin'] <= w['cx'] < col['xmax']]
        if not col_wds:
            continue

        # Satırlara grupla
        col_lines: List[List[dict]] = []
        for w in sorted(col_wds, key=lambda x: x['top']):
            for line in col_lines:
                if abs(line[0]['top'] - w['top']) <= 14:
                    line.append(w)
                    break
            else:
                col_lines.append([w])

        for line in col_lines:
            line_str = ' '.join(w['text'] for w in line)
            tm = TIME_RANGE_RE.search(line_str)
            if tm:
                start = f"{int(tm.group(1)):02d}:{tm.group(2)}"
                end = f"{int(tm.group(3)):02d}:{tm.group(4)}"
                cm = COURSE_CODE_RE.search(line_str)
                code = cm.group(1).replace(' ', '').upper() if cm else 'Ders'

                if not any(s['start_time'] == start for s in schedule[day]):
                    schedule[day].append({
                        'section': '1',
                        'code': code,
                        'name': code,
                        'classroom': '',
                        'instructor': '',
                        'start_time': start,
                        'end_time': end,
                        'is_lab': False,
                    })

    # STRATEJİ 2: Izgara / Satır-Sütun Kesişim Tespiti (Klasik Tablo)
    total_found = sum(len(v) for v in schedule.values())
    if total_found == 0:
        first_col_xmin = day_cols.get('Pazartesi', {}).get('xmin', img_w * 0.15)
        left_words = [w for w in words if w['cx'] < first_col_xmin + 30 and w['top'] > header_bottom]

        hour_rows = []
        for w in left_words:
            trm = TIME_RANGE_RE.search(w['text'])
            if trm:
                hour_rows.append({
                    'start': f"{int(trm.group(1)):02d}:{trm.group(2)}",
                    'end': f"{int(trm.group(3)):02d}:{trm.group(4)}",
                    'y': w['cy'],
                })
                continue
            sm = SINGLE_TIME_RE.match(w['text'])
            if sm:
                h_num = int(sm.group(1))
                hour_rows.append({
                    'start': f"{h_num:02d}:{sm.group(2)}",
                    'end': f"{h_num:02d}:50",
                    'y': w['cy'],
                })

        # Tekrarlayan Y saatlerini temizle
        hour_rows_sorted = sorted(hour_rows, key=lambda r: r['y'])
        clean_rows = []
        for r in hour_rows_sorted:
            if not any(abs(cr['y'] - r['y']) < 15 or cr['start'] == r['start'] for cr in clean_rows):
                clean_rows.append(r)

        if clean_rows:
            for r_idx, row in enumerate(clean_rows):
                if r_idx + 1 < len(clean_rows):
                    row_h = clean_rows[r_idx + 1]['y'] - row['y']
                elif r_idx > 0:
                    row_h = row['y'] - clean_rows[r_idx - 1]['y']
                else:
                    row_h = 50.0

                y_top = row['y'] - row_h * 0.45
                y_bot = row['y'] + row_h * 0.55

                for day in WEEKDAYS:
                    col = day_cols.get(day)
                    if not col:
                        continue
                    cell_wds = [
                        w for w in body_words
                        if (col['xmin'] + 5) <= w['cx'] < (col['xmax'] - 5)
                        and y_top <= w['cy'] < y_bot
                        and not TIME_RANGE_RE.search(w['text'])
                        and not SINGLE_TIME_RE.match(w['text'])
                        and len(w['text']) >= 2
                    ]
                    if cell_wds:
                        cell_txt = ' '.join(w['text'] for w in cell_wds)
                        cm = COURSE_CODE_RE.search(cell_txt)
                        code = cm.group(1).replace(' ', '').upper() if cm else 'Ders'

                        schedule[day].append({
                            'section': '1',
                            'code': code,
                            'name': code,
                            'classroom': '',
                            'instructor': '',
                            'start_time': row['start'],
                            'end_time': row['end'],
                            'is_lab': False,
                        })

            # Ardışık saatleri birleştir
            for day in WEEKDAYS:
                slots = schedule[day]
                if len(slots) <= 1:
                    continue
                slots.sort(key=lambda s: _to_minutes(s['start_time']))
                merged = []
                for s in slots:
                    if not merged:
                        merged.append(dict(s))
                        continue
                    prev = merged[-1]
                    prev_end = _to_minutes(prev['end_time'])
                    curr_start = _to_minutes(s['start_time'])
                    if curr_start - prev_end <= 15 and curr_start >= prev_end - 10:
                        prev['end_time'] = s['end_time']
                    else:
                        merged.append(dict(s))
                schedule[day] = merged

    summary_map = {}
    for day, items in schedule.items():
        for it in items:
            key = (it['code'], day, it['start_time'])
            if key not in summary_map:
                summary_map[key] = {
                    'code': it['code'],
                    'name': it['name'],
                    'section': it['section'],
                    'instructor': '',
                    'classrooms': [],
                    'time_slots': [{
                        'day': day,
                        'start_time': it['start_time'],
                        'end_time': it['end_time'],
                        'classroom': '',
                        'is_lab': False,
                    }]
                }

    total_courses = sum(len(v) for v in schedule.values())
    if total_courses == 0:
        raise ValueError('Görselde ders programı tespit edilemedi.')

    return {
        'status': 'success',
        'student_id': 'Görsel',
        'student_name': 'Ders Programı',
        'term': 'Aktif Dönem',
        'title': 'YTÜ Ders Programı Görseli',
        'schedule': schedule,
        'courses_summary': list(summary_map.values()),
    }

@app.post('/api/parse-schedule-file')
async def parse_schedule_file_endpoint(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if filename.endswith('.pdf'):
        return await parse_student_schedule_endpoint(file)
    elif filename.endswith(('.png', '.jpg', '.jpeg')):
        import json
        from PIL import Image

        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            img = Image.open(tmp_path)
            # 1. PNG metadata (tEXt chunk) kontrol et
            raw_meta = img.info.get('schedule_data') or img.info.get('ptu_schedule')
            if raw_meta:
                try:
                    data = json.loads(raw_meta)
                    if data and data.get('schedule'):
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
