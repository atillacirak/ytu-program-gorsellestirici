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

DAY_NAMES_LIST = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
CODE_RE_PATTERN = re.compile(r"^[A-Za-zÇĞİÖŞÜçğıöşü]{2,6}\d{3,6}$")
SECTION_RE_PATTERN = re.compile(r"[Ss][Bb]\.?\s*\)?\s*(\d+)")
TIME_RE_PATTERN = re.compile(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})")

def _strip_tr_str(s: str) -> str:
    repl = str.maketrans("İıŞşÇçĞğÖöÜü", "IiSsCcGgOoUu")
    return s.translate(repl).upper().strip()

def _ocr_words_from_image(image, lang: str = "tur+eng") -> List[dict]:
    import pytesseract
    try:
        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
    except Exception:
        data = pytesseract.image_to_data(image, lang="eng", output_type=pytesseract.Output.DICT)

    words = []
    n = len(data.get("text", []))
    for i in range(n):
        text = data["text"][i].strip()
        if not text:
            continue
        words.append({
            "text": text,
            "left": data["left"][i],
            "top": data["top"][i],
            "width": data["width"][i],
            "height": data["height"][i],
        })
    return words

def _find_header_columns_in_words(words: List[dict]) -> Optional[Dict[str, float]]:
    targets = {
        "SAAT": "SAAT",
        "PAZARTESI": "Pazartesi",
        "SALI": "Salı",
        "CARSAMBA": "Çarşamba",
        "PERSEMBE": "Perşembe",
        "CUMA": "Cuma",
        "CUMARTESI": "Cumartesi",
        "PAZAR": "Pazar",
    }
    found: Dict[str, float] = {}
    candidates = [w for w in words if w["top"] < 260]
    for w in candidates:
        norm = _strip_tr_str(w["text"])
        if norm in targets:
            day = targets[norm]
            cx = w["left"] + w["width"] / 2
            if day not in found:
                found[day] = cx
    return found if "SAAT" in found and len(found) >= 3 else None

def _refine_column_boundaries_in_words(header_centers: Dict[str, float], body_words: List[dict], image_width: int) -> List[tuple]:
    ordered = sorted(header_centers.items(), key=lambda kv: kv[1])
    names = [n for n, _ in ordered]
    centers = [c for _, c in ordered]
    rough_bounds = [(centers[i - 1] + centers[i]) / 2 for i in range(1, len(centers))]

    def bucket_of(cx: float) -> int:
        idx = 0
        for b in rough_bounds:
            if cx < b:
                return idx
            idx += 1
        return idx

    buckets: List[List[dict]] = [[] for _ in names]
    for w in body_words:
        cx = w["left"] + w["width"] / 2
        buckets[bucket_of(cx)].append(w)

    def content_words(ws):
        return [w for w in ws if len(w["text"]) >= 3]

    min_left = []
    max_right = []
    for ws in buckets:
        cw = content_words(ws) or ws
        if cw:
            min_left.append(min(w["left"] for w in cw))
            max_right.append(max(w["left"] + w["width"] for w in cw))
        else:
            min_left.append(None)
            max_right.append(None)

    refined_bounds = []
    for i in range(1, len(names)):
        left_edge = max_right[i - 1]
        right_edge = min_left[i]
        if left_edge is not None and right_edge is not None and right_edge > left_edge:
            refined_bounds.append((left_edge + right_edge) / 2)
        else:
            refined_bounds.append(rough_bounds[i - 1])

    result = []
    for i in range(1, len(names)):
        x_min = refined_bounds[i - 1]
        x_max = refined_bounds[i] if i < len(refined_bounds) else image_width
        result.append((names[i], x_min, x_max))
    return result

def _group_words_into_lines(words: List[dict], tol: int = 14) -> List[List[dict]]:
    ws = sorted(words, key=lambda w: w["top"])
    lines: List[List[dict]] = []
    for w in ws:
        placed = False
        for line in lines:
            if abs(line[0]["top"] - w["top"]) <= tol:
                line.append(w)
                placed = True
                break
        if not placed:
            lines.append([w])
    for line in lines:
        line.sort(key=lambda w: w["left"])
    lines.sort(key=lambda line: line[0]["top"])
    return lines

def _line_text_from_words(line: List[dict]) -> str:
    return " ".join(w["text"] for w in line)

def _parse_single_card_from_block(block: List[List[dict]]) -> Optional[dict]:
    if not block:
        return None
    header_text = _line_text_from_words(block[0])
    code_match = CODE_RE_PATTERN.match(block[0][0]["text"])
    if not code_match:
        return None
    course_code = block[0][0]["text"]

    section = None
    sec_m = SECTION_RE_PATTERN.search(header_text)
    if sec_m:
        section = int(sec_m.group(1))

    time_line_idx = None
    start_time = end_time = None
    for i, line in enumerate(block[1:], start=1):
        t = TIME_RE_PATTERN.search(_line_text_from_words(line))
        if t:
            start_time, end_time = t.group(1), t.group(2)
            time_line_idx = i
            break

    name_lines = block[1:time_line_idx] if time_line_idx else block[1:]
    name = " ".join(_line_text_from_words(l) for l in name_lines).strip()

    room = None
    if time_line_idx is not None:
        room_lines = block[time_line_idx + 1:]
        room = " ".join(_line_text_from_words(l) for l in room_lines).strip() or None

    return {
        "course_code": course_code,
        "section": section,
        "name": name or None,
        "start": start_time,
        "end": end_time,
        "room": room,
    }

def _parse_cards_from_lines(lines: List[List[dict]]) -> List[dict]:
    start_idxs = [i for i, line in enumerate(lines) if CODE_RE_PATTERN.match(line[0]["text"])]
    cards = []
    for n, start in enumerate(start_idxs):
        end = start_idxs[n + 1] if n + 1 < len(start_idxs) else len(lines)
        block = lines[start:end]
        c = _parse_single_card_from_block(block)
        if c:
            cards.append(c)
    return cards

def parse_schedule_image_ytu(image) -> dict:
    words = _ocr_words_from_image(image)
    if not words:
        raise ValueError("Görselde OCR kelimesi bulunamadı.")
    
    header_centers = _find_header_columns_in_words(words)
    if not header_centers:
        raise ValueError("Şema gün başlıkları tespit edilemedi.")

    header_bottom = max(w["top"] + w["height"] for w in words if w["top"] < 260)
    body_words = [w for w in words if w["top"] > header_bottom]
    columns = _refine_column_boundaries_in_words(header_centers, body_words, image.width)

    schedule: Dict[str, list] = {d: [] for d in DAY_NAMES_LIST}
    courses_summary_map: Dict[tuple, dict] = {}

    for day, x_min, x_max in columns:
        col_words = [w for w in body_words if x_min <= w["left"] < x_max]
        if not col_words:
            continue
        lines = _group_words_into_lines(col_words)
        cards = _parse_cards_from_lines(lines)
        for c in cards:
            start_t = c["start"] or "09:00"
            end_t = c["end"] or "10:50"
            sec_no = str(c["section"]) if c["section"] else "1"
            code = c["course_code"].upper()
            name = c["name"] or code
            classroom = c["room"] or "Derslik"

            item = {
                "section": sec_no,
                "code": code,
                "name": name,
                "classroom": classroom,
                "instructor": "",
                "start_time": start_t,
                "end_time": end_t,
                "is_lab": "LAB" in classroom.upper() or "LAB" in name.upper()
            }
            if day in schedule:
                schedule[day].append(item)

            ckey = (code, sec_no)
            if ckey not in courses_summary_map:
                courses_summary_map[ckey] = {
                    "code": code,
                    "name": name,
                    "section": sec_no,
                    "instructor": "",
                    "classrooms": set(),
                    "time_slots": []
                }
            courses_summary_map[ckey]["classrooms"].add(classroom)
            courses_summary_map[ckey]["time_slots"].append({
                "day": day,
                "start_time": start_t,
                "end_time": end_t,
                "classroom": classroom,
                "is_lab": item["is_lab"]
            })

    summary_list = []
    for ckey, cinfo in courses_summary_map.items():
        cinfo["classrooms"] = sorted(list(cinfo["classrooms"]))
        summary_list.append(cinfo)

    return {
        "status": "success",
        "student_id": "Görsel",
        "student_name": "Öğrenci (Görsel)",
        "term": "Aktif Dönem",
        "title": "YTÜ Ders Programı Görseli",
        "schedule": schedule,
        "courses_summary": summary_list
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
            # 1. PNG metadata (tEXt chunk / info) kontrol et
            raw_meta = img.info.get('schedule_data') or img.info.get('ptu_schedule')
            if raw_meta:
                try:
                    data = json.loads(raw_meta)
                    return data
                except Exception:
                    pass
            
            # 2. Metadata yoksa kullanıcının YTÜ OCR script algoritması ile görseli ayrıştır
            try:
                data = parse_schedule_image_ytu(img)
                if data and data.get("schedule"):
                    return data
            except Exception as ocr_err:
                print("YTÜ OCR Parse error:", ocr_err)
            
            raise HTTPException(
                status_code=400, 
                detail='Yüklenen görseldeki YTÜ ders programı şeması okunamadı. Lütfen görselin net ve yüksek çözünürlüklü olduğundan veya Report.pdf belgesi yüklediğinizden emin olun.'
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Görsel dosyası işlenirken hata oluştu: {str(e)}')
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
    else:
        raise HTTPException(status_code=400, detail='Lütfen geçerli bir PDF (.pdf) veya Ders Programı Görseli (.png) yükleyin.')
