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
# PNG / gorsel ayrıstırma -- basit saat+gun tespiti
# Ders kodu zorunlu degil; bulunamazsa 'Ders' yazar.
# ---------------------------------------------------------------------------

_DAYS_DISPLAY = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar']

_DAY_NORM_MAP = {
    'PAZARTESI': 'Pazartesi',
    'SALI':      'Sali',
    'CARSAMBA':  'Carsamba',
    'PERSEMBE':  'Persembe',
    'CUMA':      'Cuma',
    'CUMARTESI': 'Cumartesi',
    'PAZAR':     'Pazar',
}

_TRANGE_RE  = re.compile(r'(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})')
_TSINGLE_RE = re.compile(r'^\d{1,2}[.:]\d{2}$')
_CODE_RE    = re.compile(r'([A-ZÇĞİÖŞÜ]{2,6}\s*\d{3,6})')

def _tr_norm(s):
    table = str.maketrans('IışŞçÇğĞöÖüÜ', 'IISSCCGGOOUu')
    return s.translate(table).upper().strip()

def _ocr_words(image, lang='tur+eng'):
    import pytesseract
    try:
        raw = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
    except Exception:
        raw = pytesseract.image_to_data(image, lang='eng', output_type=pytesseract.Output.DICT)
    out = []
    for i, txt in enumerate(raw.get('text', [])):
        txt = (txt or '').strip()
        if txt:
            out.append({'text': txt, 'left': raw['left'][i], 'top': raw['top'][i],
                        'w': raw['width'][i], 'h': raw['height'][i]})
    return out

def _group_lines(words, tol=12):
    lines = []
    for w in sorted(words, key=lambda x: x['top']):
        for ln in lines:
            if abs(ln[0]['top'] - w['top']) <= tol:
                ln.append(w)
                break
        else:
            lines.append([w])
    for ln in lines:
        ln.sort(key=lambda x: x['left'])
    return sorted(lines, key=lambda ln: ln[0]['top'])

def parse_schedule_image_ytu(image):
    words = _ocr_words(image)
    if not words:
        raise ValueError('OCR kelimesi bulunamadi.')

    img_w = image.width
    img_h = image.height
    header_limit = min(int(img_h * 0.28), 350)

    # 1. Gun sutunlarini bul
    day_cols = {}
    for w in words:
        if w['top'] >= header_limit:
            continue
        norm = _tr_norm(w['text'])
        if norm in _DAY_NORM_MAP:
            display = _DAY_NORM_MAP[norm]
            if display not in day_cols:
                cx = w['left'] + w['w'] / 2
                day_cols[display] = {'cx': cx, 'x0': w['left'], 'x1': w['left'] + w['w']}

    if day_cols:
        sdays = sorted(day_cols.items(), key=lambda kv: kv[1]['cx'])
        for i, (day, info) in enumerate(sdays):
            info['xmin'] = (sdays[i-1][1]['cx'] + info['cx']) / 2 if i > 0 else 0
            info['xmax'] = (info['cx'] + sdays[i+1][1]['cx']) / 2 if i < len(sdays)-1 else img_w

    # 2. Saat araligini iceren satirlari bul
    all_lines = _group_lines(words)
    time_rows = []
    for ln in all_lines:
        txt = ' '.join(x['text'] for x in ln)
        m = _TRANGE_RE.search(txt)
        if m:
            start = '{:02d}:{}'.format(int(m.group(1)), m.group(2))
            end   = '{:02d}:{}'.format(int(m.group(3)), m.group(4))
            y_mid = ln[0]['top'] + ln[0]['h'] / 2
            time_rows.append({'y': y_mid, 'start': start, 'end': end, 'ln': ln})

    # 3. Body kelimeleri (baslik altinda)
    hdr_bottom = max((w['top'] + w['h'] for w in words if w['top'] < header_limit), default=100)
    body = [w for w in words if w['top'] > hdr_bottom]

    # 4. Her (gun, saat) icin ders var mi?
    schedule = {d: [] for d in _DAYS_DISPLAY}
    summary_map = {}

    t_sorted = sorted(time_rows, key=lambda r: r['y'])
    for ti, tr in enumerate(t_sorted):
        ln_h = tr['ln'][0]['h'] if tr['ln'] else 20
        y0 = tr['y'] - ln_h * 0.8
        y1 = t_sorted[ti+1]['y'] - ln_h * 0.3 if ti+1 < len(t_sorted) else tr['y'] + ln_h * 6

        for day, col in day_cols.items():
            xmin = col.get('xmin', col['x0'] - 30)
            xmax = col.get('xmax', col['x1'] + 30)

            slot_wds = [
                w for w in body
                if xmin <= (w['left'] + w['w'] / 2) < xmax
                and y0 <= w['top'] < y1
                and not _TRANGE_RE.search(w['text'])
                and not _TSINGLE_RE.match(w['text'])
                and len(w['text']) >= 2
            ]
            if not slot_wds:
                continue

            slot_txt = ' '.join(x['text'] for x in slot_wds)
            cm = _CODE_RE.search(slot_txt)
            code = cm.group(1).replace(' ', '').upper() if cm else 'Ders'

            item = {
                'section': '1', 'code': code, 'name': code,
                'classroom': '', 'instructor': '',
                'start_time': tr['start'], 'end_time': tr['end'], 'is_lab': False,
            }
            if day in schedule and not any(s['start_time'] == tr['start'] for s in schedule[day]):
                schedule[day].append(item)

            key = (code, day, tr['start'])
            if key not in summary_map:
                summary_map[key] = {
                    'code': code, 'name': code, 'section': '1',
                    'instructor': '', 'classrooms': [],
                    'time_slots': [{'day': day, 'start_time': tr['start'],
                                    'end_time': tr['end'], 'classroom': '', 'is_lab': False}]
                }

    return {
        'status': 'success',
        'student_id': 'Gorsel', 'student_name': 'Ogrenci (Gorsel)',
        'term': 'Aktif Donem', 'title': 'YTU Ders Programi',
        'schedule': schedule, 'courses_summary': list(summary_map.values()),
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
            raw_meta = img.info.get('schedule_data') or img.info.get('ptu_schedule')
            if raw_meta:
                try:
                    return json.loads(raw_meta)
                except Exception:
                    pass
            try:
                data = parse_schedule_image_ytu(img)
                total = sum(len(v) for v in data.get('schedule', {}).values())
                if total > 0:
                    return data
            except Exception as ocr_err:
                print('OCR error:', ocr_err)

            raise HTTPException(status_code=400,
                detail='Gorseldeki ders programi okunamadi. Yuksek cozunurluklu gorsel veya Report.pdf yukleyin.')
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail='Gorsel islem hatasi: ' + str(e))
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass
    else:
        raise HTTPException(status_code=400, detail='Lutfen gecerli bir PDF veya PNG dosyasi yukleyin.')
