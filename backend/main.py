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
# Geometrik Izgara & Blok Tabanli PNG / Gorsel Ayrıştırıcı
# ---------------------------------------------------------------------------

ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
DAY_INDEX_MAP = {'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4}

STANDARD_HOURS = [
    {'start': '08:00', 'end': '08:50'},
    {'start': '09:00', 'end': '09:50'},
    {'start': '10:00', 'end': '10:50'},
    {'start': '11:00', 'end': '11:50'},
    {'start': '12:00', 'end': '12:50'},
    {'start': '13:00', 'end': '13:50'},
    {'start': '14:00', 'end': '14:50'},
    {'start': '15:00', 'end': '15:50'},
    {'start': '16:00', 'end': '16:50'},
    {'start': '17:00', 'end': '17:50'},
    {'start': '18:00', 'end': '18:50'},
]

COURSE_CODE_RE = re.compile(r'([A-Za-zÇĞİÖŞÜçğıöşü0-9_]{2,8}\s*\d{3,4})')

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

    # 2. Tablo Dikey Izgara Hesaplama
    body_bottom = max((w['top'] + w['h'] for w in body_words), default=img_h * 0.9)
    table_top_y = header_bottom + 5
    table_bottom_y = body_bottom + 10
    table_height = table_bottom_y - table_top_y
    num_rows = len(STANDARD_HOURS)
    row_height = table_height / num_rows

    def y_to_hour_index(y: float) -> int:
        raw_idx = (y - table_top_y) / row_height
        return max(0, min(num_rows - 1, int(raw_idx)))

    schedule: Dict[str, list] = {d: [] for d in ALL_DAYS}

    # 3. Her Gün Sütunundaki Kelimeleri Blok Olarak Grupla
    for day in WEEKDAYS:
        col = day_cols.get(day)
        if not col:
            continue

        col_wds = [w for w in body_words if (col['xmin'] + 5) <= w['cx'] < (col['xmax'] - 5)]
        if not col_wds:
            continue

        col_wds.sort(key=lambda x: x['top'])
        card_blocks: List[List[dict]] = []
        current_block = [col_wds[0]]

        for i in range(1, len(col_wds)):
            prev_w = current_block[-1]
            curr_w = col_wds[i]
            v_gap = curr_w['top'] - (prev_w['top'] + prev_w['h'])

            if v_gap <= row_height * 1.15:
                current_block.append(curr_w)
            else:
                card_blocks.append(current_block)
                current_block = [curr_w]

        if current_block:
            card_blocks.append(current_block)

        for block in card_blocks:
            b_top = min(w['top'] for w in block)
            b_bot = max(w['top'] + w['h'] for w in block)

            s_idx = y_to_hour_index(b_top + 5)
            e_idx = y_to_hour_index(b_bot - 5)

            start_t = STANDARD_HOURS[s_idx]['start']
            end_t = STANDARD_HOURS[max(s_idx, e_idx)]['end']

            b_text = ' '.join(w['text'] for w in block)
            cm = COURSE_CODE_RE.search(b_text)
            code = cm.group(1).replace(' ', '').upper() if cm else 'Ders'

            schedule[day].append({
                'section': '1',
                'code': code,
                'name': code,
                'classroom': '',
                'instructor': '',
                'start_time': start_t,
                'end_time': end_t,
                'is_lab': False,
            })

        # Bitişik / aralıksız slotları birleştir
        slots = schedule[day]
        if len(slots) > 1:
            slots.sort(key=lambda s: _to_minutes(s['start_time']))
            merged = []
            for s in slots:
                if not merged:
                    merged.append(dict(s))
                    continue
                prev = merged[-1]
                prev_end = _to_minutes(prev['end_time'])
                curr_start = _to_minutes(s['start_time'])
                if curr_start <= prev_end + 65:
                    prev['end_time'] = s['end_time']
                    if s['code'] != 'Ders' and prev['code'] == 'Ders':
                        prev['code'] = s['code']
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
