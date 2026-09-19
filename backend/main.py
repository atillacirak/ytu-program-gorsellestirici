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
# Durum Makineli & Kalibre Geometrik Izgara PNG / Gorsel Ayrıştırıcı
# ---------------------------------------------------------------------------

ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
DAY_INDEX_MAP = {'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4}

STANDARD_HOURS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

COURSE_CODE_RE = re.compile(r'([A-ZÇĞİÖŞÜ]{2,5}\s*\d{3,4})')

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
    if re.search(r'\b[A-ZÇĞİÖŞÜ]{2,5}\s*\d{3,4}\b', txt):
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
            if 8 <= h <= 18:
                hour_detections.append({'hour': h, 'y': w['cy']})

    row_height = 48.0
    row0_center = header_bottom + 25.0

    if len(hour_detections) >= 2:
        h0 = hour_detections[0]
        hN = hour_detections[-1]
        if hN['hour'] != h0['hour']:
            row_height = (hN['y'] - h0['y']) / (hN['hour'] - h0['hour'])
            row0_center = h0['y'] - (h0['hour'] - 8) * row_height
    else:
        body_words_tmp = [w for w in words if w['top'] > header_bottom]
        body_bottom = max((w['top'] + w['h'] for w in body_words_tmp), default=img_h * 0.9)
        row_height = (body_bottom - header_bottom) / 11
        row0_center = header_bottom + row_height / 2

    body_words = [w for w in words if w['top'] > header_bottom]
    schedule: Dict[str, list] = {d: [] for d in ALL_DAYS}

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

        words_in_hour: List[List[dict]] = [[] for _ in range(11)]
        for w in col_wds:
            h_idx = max(0, min(10, int((w['cy'] - row0_center + row_height * 0.45) // row_height)))
            words_in_hour[h_idx].append(w)

        card_list = []
        cur_card = None

        for h in range(11):
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
                    next_wds = words_in_hour[h + 1] if h + 1 < 11 else []
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
