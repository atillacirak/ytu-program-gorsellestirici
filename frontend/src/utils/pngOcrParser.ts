import { createWorker } from 'tesseract.js';

export interface ParsedScheduleData {
  student_id: string;
  student_name: string;
  term: string;
  title: string;
  schedule: Record<string, any[]>;
  courses_summary: any[];
}

const DAYS_DISPLAY = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const DAY_NORM_MAP: Record<string, string> = {
  PAZARTESI: 'Pazartesi',
  SALI: 'Salı',
  CARSAMBA: 'Çarşamba',
  PERSEMBE: 'Perşembe',
  CUMA: 'Cuma',
  CUMARTESI: 'Cumartesi',
  PAZAR: 'Pazar',
};

const TRANGE_RE = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/;
const TSINGLE_RE = /^\d{1,2}[.:]\d{2}$/;
const CODE_RE = /([A-ZÇĞİÖŞÜ]{2,6}\s*\d{3,6})/;

function trNorm(s: string): string {
  return s
    .replace(/İ/g, 'I').replace(/ı/g, 'I')
    .replace(/Ş/g, 'S').replace(/ş/g, 'S')
    .replace(/Ç/g, 'C').replace(/ç/g, 'C')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'G')
    .replace(/Ö/g, 'O').replace(/ö/g, 'O')
    .replace(/Ü/g, 'U').replace(/ü/g, 'U')
    .toUpperCase().trim();
}

interface Word {
  text: string;
  left: number;
  top: number;
  w: number;
  h: number;
}

interface TimeRow {
  y: number;
  start: string;
  end: string;
  words: Word[];
}

interface DayCol {
  cx: number;
  x0: number;
  x1: number;
  xmin?: number;
  xmax?: number;
}

function groupLines(words: Word[], tol = 12): Word[][] {
  const lines: Word[][] = [];
  const sorted = [...words].sort((a, b) => a.top - b.top);
  for (const w of sorted) {
    let placed = false;
    for (const ln of lines) {
      if (Math.abs(ln[0].top - w.top) <= tol) {
        ln.push(w);
        placed = true;
        break;
      }
    }
    if (!placed) lines.push([w]);
  }
  for (const ln of lines) ln.sort((a, b) => a.left - b.left);
  return lines.sort((a, b) => a[0].top - b[0].top);
}

/**
 * Metadata barındırmayan ders programı PNG görselini OCR ile tarayarak
 * yalnızca dolu gün + saat bilgisini döndürür.
 * Ders kodu bulunamazsa "Ders" yazar.
 */
export async function parseScheduleImageWithOcr(imageFile: File): Promise<ParsedScheduleData> {
  const worker = await createWorker('tur+eng');

  try {
    const imageUrl = URL.createObjectURL(imageFile);
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    // Tüm kelimeleri bbox ile topla
    const rawWords: Word[] = [];
    const blocks = (ret.data as any).blocks || [];
    blocks.forEach((b: any) => {
      (b.paragraphs || []).forEach((p: any) => {
        (p.lines || []).forEach((l: any) => {
          (l.words || []).forEach((w: any) => {
            const txt = (w.text || '').trim();
            if (txt && w.bbox) {
              rawWords.push({
                text: txt,
                left: w.bbox.x0,
                top: w.bbox.y0,
                w: w.bbox.x1 - w.bbox.x0,
                h: w.bbox.y1 - w.bbox.y0,
              });
            }
          });
        });
      });
    });

    // Görüntü boyutu tahmini (OCR bbox max değerinden)
    const imgW = rawWords.length ? Math.max(...rawWords.map(w => w.left + w.w)) : 1000;
    const imgH = rawWords.length ? Math.max(...rawWords.map(w => w.top + w.h)) : 800;
    const headerLimit = Math.min(Math.floor(imgH * 0.28), 350);

    // 1. Gün sütunlarını bul
    const dayColMap: Record<string, DayCol> = {};
    for (const w of rawWords) {
      if (w.top >= headerLimit) continue;
      const norm = trNorm(w.text);
      if (norm in DAY_NORM_MAP) {
        const display = DAY_NORM_MAP[norm];
        if (!(display in dayColMap)) {
          const cx = w.left + w.w / 2;
          dayColMap[display] = { cx, x0: w.left, x1: w.left + w.w };
        }
      }
    }

    // Sütun x sınırlarını belirle
    const sortedDays = Object.entries(dayColMap).sort((a, b) => a[1].cx - b[1].cx);
    sortedDays.forEach(([, info], i) => {
      info.xmin = i > 0 ? (sortedDays[i - 1][1].cx + info.cx) / 2 : 0;
      info.xmax = i < sortedDays.length - 1 ? (info.cx + sortedDays[i + 1][1].cx) / 2 : imgW;
    });

    // 2. Saat aralığı içeren satırları bul
    const allLines = groupLines(rawWords);
    const timeRows: TimeRow[] = [];
    for (const ln of allLines) {
      const txt = ln.map(w => w.text).join(' ');
      const m = TRANGE_RE.exec(txt);
      if (m) {
        const start = `${String(m[1]).padStart(2, '0')}:${m[2]}`;
        const end = `${String(m[3]).padStart(2, '0')}:${m[4]}`;
        const yMid = ln[0].top + ln[0].h / 2;
        timeRows.push({ y: yMid, start, end, words: ln });
      }
    }

    // 3. Body kelimeleri
    const headerWords = rawWords.filter(w => w.top < headerLimit);
    const hdrBottom = headerWords.length
      ? Math.max(...headerWords.map(w => w.top + w.h))
      : 100;
    const body = rawWords.filter(w => w.top > hdrBottom);

    // 4. Her (gün, saat) için ders var mı?
    const schedule: Record<string, any[]> = {};
    for (const d of DAYS_DISPLAY) schedule[d] = [];

    const summaryMap: Record<string, any> = {};
    const tSorted = [...timeRows].sort((a, b) => a.y - b.y);

    for (let ti = 0; ti < tSorted.length; ti++) {
      const tr = tSorted[ti];
      const lnH = tr.words[0]?.h || 20;
      const y0 = tr.y - lnH * 0.8;
      const y1 = ti + 1 < tSorted.length
        ? tSorted[ti + 1].y - lnH * 0.3
        : tr.y + lnH * 6;

      for (const [day, col] of sortedDays) {
        const xmin = col.xmin ?? col.x0 - 30;
        const xmax = col.xmax ?? col.x1 + 30;

        const slotWds = body.filter(w => {
          const cx = w.left + w.w / 2;
          return cx >= xmin && cx < xmax
            && w.top >= y0 && w.top < y1
            && !TRANGE_RE.test(w.text)
            && !TSINGLE_RE.test(w.text)
            && w.text.length >= 2;
        });

        if (slotWds.length === 0) continue;

        const slotTxt = slotWds.map(w => w.text).join(' ');
        const cm = CODE_RE.exec(slotTxt);
        const code = cm ? cm[1].replace(/\s+/g, '').toUpperCase() : 'Ders';

        const item = {
          section: '1', code, name: code,
          classroom: '', instructor: '',
          start_time: tr.start, end_time: tr.end, is_lab: false,
        };

        if (schedule[day] && !schedule[day].some(s => s.start_time === tr.start)) {
          schedule[day].push(item);
        }

        const key = `${code}|${day}|${tr.start}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            code, name: code, section: '1', instructor: '', classrooms: [],
            time_slots: [{ day, start_time: tr.start, end_time: tr.end, classroom: '', is_lab: false }],
          };
        }
      }
    }

    return {
      student_id: 'Gorsel',
      student_name: 'Ogrenci (Gorsel)',
      term: 'Aktif Donem',
      title: 'YTU Ders Programi',
      schedule,
      courses_summary: Object.values(summaryMap),
    };
  } catch (err) {
    console.error('OCR Parsing Error:', err);
    throw new Error('Görsel üzerindeki ders saatleri okunamadı. Lütfen görselin net olduğundan veya Report.pdf yüklediğinizden emin olun.');
  }
}
