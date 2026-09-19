import { createWorker } from 'tesseract.js';

export interface ParsedScheduleData {
  student_id: string;
  student_name: string;
  term: string;
  title: string;
  schedule: Record<string, any[]>;
  courses_summary: any[];
}

const ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const DAY_INDEX_MAP: Record<string, number> = {
  'Pazartesi': 0,
  'Salı': 1,
  'Çarşamba': 2,
  'Perşembe': 3,
  'Cuma': 4,
  'Cumartesi': 5,
  'Pazar': 6,
};

function matchDayName(rawStr: string): string | null {
  const s = rawStr
    .toLowerCase()
    .replace(/[ıiİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u');

  if (/pazar.*tesi|pzr.*tes|pzt|pazarte/i.test(s)) return 'Pazartesi';
  if (/sal[i1!l]/i.test(s)) return 'Salı';
  if (/c[a-z]*r[s]am|car[s]|crs/i.test(s)) return 'Çarşamba';
  if (/per[s]em|prs/i.test(s)) return 'Perşembe';
  if (/cum[a-z]*tesi|cmt/i.test(s)) return 'Cumartesi';
  if (/cum[a!]/i.test(s)) return 'Cuma';
  if (/pazar/i.test(s)) return 'Pazar';
  return null;
}

interface WordBox {
  text: string;
  left: number;
  top: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

const TIME_RANGE_REGEX = /(\d{1,2})[\s.:](\d{2})\s*[-–~to/]\s*(\d{1,2})[\s.:](\d{2})/;
const SINGLE_TIME_REGEX = /^(\d{1,2})[\s.:](\d{2})$/;
const COURSE_CODE_REGEX = /([A-ZÇĞİÖŞÜ]{2,6}\s*\d{3,6})/i;

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.replace('.', ':').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toTimeStr(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Görseldeki dolu ders saatlerini ve günlerini maksimum toleransla ayrıştırır.
 * Ders kodu / adı bulunamazsa 'Ders' yazar.
 */
export async function parseScheduleImageWithOcr(imageFile: File): Promise<ParsedScheduleData> {
  const worker = await createWorker('tur+eng');

  try {
    const imageUrl = URL.createObjectURL(imageFile);
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    const rawWords: WordBox[] = [];
    const blocks = (ret.data as any).blocks || [];
    blocks.forEach((b: any) => {
      (b.paragraphs || []).forEach((p: any) => {
        (p.lines || []).forEach((l: any) => {
          (l.words || []).forEach((w: any) => {
            const txt = (w.text || '').trim();
            if (txt && w.bbox) {
              const left = w.bbox.x0;
              const top = w.bbox.y0;
              const width = w.bbox.x1 - w.bbox.x0;
              const height = w.bbox.y1 - w.bbox.y0;
              rawWords.push({
                text: txt,
                left,
                top,
                w: width,
                h: height,
                cx: left + width / 2,
                cy: top + height / 2,
              });
            }
          });
        });
      });
    });

    if (rawWords.length === 0) {
      throw new Error('Görselde metin tespit edilemedi.');
    }

    const imgW = Math.max(...rawWords.map(w => w.left + w.w));
    const imgH = Math.max(...rawWords.map(w => w.top + w.h));

    // 1. GÜN SÜTUNLARINI TESPİT ET (Üst %40 alandaki başlıklar)
    const headerLimit = Math.min(Math.floor(imgH * 0.40), 400);
    const headerWords = rawWords.filter(w => w.top < headerLimit);

    const detectedDayMap: Record<string, { day: string; cx: number; top: number; bottom: number }> = {};
    for (const w of headerWords) {
      const d = matchDayName(w.text);
      if (d && !detectedDayMap[d]) {
        detectedDayMap[d] = {
          day: d,
          cx: w.cx,
          top: w.top,
          bottom: w.top + w.h,
        };
      }
    }

    const detectedEntries = Object.values(detectedDayMap).sort((a, b) => a.cx - b.cx);
    const dayColBounds: Record<string, { xmin: number; xmax: number; cx: number }> = {};

    if (detectedEntries.length >= 2) {
      // 2 veya daha fazla gün bulunduysa aralık üzerinden tüm 5 günü eksiksiz hesapla
      const first = detectedEntries[0];
      const last = detectedEntries[detectedEntries.length - 1];
      const firstIdx = DAY_INDEX_MAP[first.day] ?? 0;
      const lastIdx = DAY_INDEX_MAP[last.day] ?? 4;
      const colWidth = (last.cx - first.cx) / Math.max(1, lastIdx - firstIdx);

      WEEKDAYS.forEach((day, idx) => {
        const cx = first.cx + (idx - firstIdx) * colWidth;
        dayColBounds[day] = {
          cx,
          xmin: Math.max(0, cx - colWidth / 2),
          xmax: Math.min(imgW, cx + colWidth / 2),
        };
      });
    } else {
      // Başlıklar tam okunamadıysa görselin sol %15 saat alanı sonrasını 5 eşit güne böl
      const leftMargin = imgW * 0.14;
      const colWidth = (imgW - leftMargin) / 5;
      WEEKDAYS.forEach((day, idx) => {
        const cx = leftMargin + (idx + 0.5) * colWidth;
        dayColBounds[day] = {
          cx,
          xmin: leftMargin + idx * colWidth,
          xmax: leftMargin + (idx + 1) * colWidth,
        };
      });
    }

    const headerBottomY = detectedEntries.length
      ? Math.max(...detectedEntries.map(d => d.bottom))
      : imgH * 0.12;

    const bodyWords = rawWords.filter(w => w.top > headerBottomY);

    const schedule: Record<string, any[]> = {};
    ALL_DAYS.forEach(d => { schedule[d] = []; });

    // STRATEJİ 1: Sütun İçinde Doğrudan Saat Aralığı Tespiti (Kart veya Etiket formatı)
    WEEKDAYS.forEach(day => {
      const col = dayColBounds[day];
      if (!col) return;

      const colWords = bodyWords.filter(w => w.cx >= col.xmin && w.cx < col.xmax);
      if (colWords.length === 0) return;

      // Kelimeleri satırlara grupla
      const colLines: WordBox[][] = [];
      const sortedColWords = [...colWords].sort((a, b) => a.top - b.top);
      sortedColWords.forEach(w => {
        let placed = false;
        for (const line of colLines) {
          if (Math.abs(line[0].top - w.top) <= 14) {
            line.push(w);
            placed = true;
            break;
          }
        }
        if (!placed) colLines.push([w]);
      });

      colLines.forEach(line => {
        const lineText = line.map(w => w.text).join(' ');
        const tm = TIME_RANGE_REGEX.exec(lineText);
        if (tm) {
          const start = `${String(tm[1]).padStart(2, '0')}:${tm[2]}`;
          const end = `${String(tm[3]).padStart(2, '0')}:${tm[4]}`;
          const cm = COURSE_CODE_REGEX.exec(lineText);
          const code = cm ? cm[1].replace(/\s+/g, '').toUpperCase() : 'Ders';

          if (!schedule[day].some(s => s.start_time === start)) {
            schedule[day].push({
              section: '1',
              code,
              name: code,
              classroom: '',
              instructor: '',
              start_time: start,
              end_time: end,
              is_lab: false,
            });
          }
        }
      });
    });

    // STRATEJİ 2: Izgara / Satır-Sütun Kesişim Tespiti (Klasik Tablo Formatı)
    // Eğer doğrudan saat aralıkları bulunamadıysa (veya az bulunduysa), sol saat etiketlerinden ızgara tara
    const totalFoundDirect = Object.values(schedule).reduce((acc, list) => acc + list.length, 0);

    if (totalFoundDirect === 0) {
      // Sol taraftaki saat etiketlerini tespit et (x < ilk günün xmin + 20)
      const firstColXmin = dayColBounds['Pazartesi']?.xmin || imgW * 0.15;
      const leftWords = rawWords.filter(w => w.cx < firstColXmin + 30 && w.top > headerBottomY);

      // Sol kelimelerden saat satırlarını çıkar
      interface HourRow {
        start: string;
        end: string;
        y: number;
        h: number;
      }
      const hourRows: HourRow[] = [];

      leftWords.forEach(w => {
        // Aralık kontrolü (örn. 08:00 - 8:50 veya 08:00 - 08:50)
        const trm = TIME_RANGE_REGEX.exec(w.text);
        if (trm) {
          hourRows.push({
            start: `${String(trm[1]).padStart(2, '0')}:${trm[2]}`,
            end: `${String(trm[3]).padStart(2, '0')}:${trm[4]}`,
            y: w.cy,
            h: w.h,
          });
          return;
        }

        // Tekil saat kontrolü (örn. 08:00, 09:00, 10:00)
        const sm = SINGLE_TIME_REGEX.exec(w.text);
        if (sm) {
          const hNum = parseInt(sm[1], 10);
          const start = `${String(hNum).padStart(2, '0')}:${sm[2]}`;
          const end = `${String(hNum).padStart(2, '0')}:50`;
          hourRows.push({
            start,
            end,
            y: w.cy,
            h: w.h,
          });
        }
      });

      // Tekrarlayan veya çok yakın Y saat satırlarını filtrele
      const sortedRows = hourRows.sort((a, b) => a.y - b.y);
      const cleanRows: HourRow[] = [];
      sortedRows.forEach(r => {
        if (!cleanRows.some(cr => Math.abs(cr.y - r.y) < 15 || cr.start === r.start)) {
          cleanRows.push(r);
        }
      });

      // Izgara üzerindeki her (Gün, Saat) hücresini kontrol et
      if (cleanRows.length > 0) {
        cleanRows.forEach((row, rIdx) => {
          const rowHeight = cleanRows[rIdx + 1]
            ? cleanRows[rIdx + 1].y - row.y
            : (cleanRows[rIdx - 1] ? row.y - cleanRows[rIdx - 1].y : 50);

          const yTop = row.y - rowHeight * 0.45;
          const yBottom = row.y + rowHeight * 0.55;

          WEEKDAYS.forEach(day => {
            const col = dayColBounds[day];
            if (!col) return;

            // Hücre içindeki kelimeleri bul
            const cellWords = bodyWords.filter(w =>
              w.cx >= col.xmin + 5 &&
              w.cx < col.xmax - 5 &&
              w.cy >= yTop &&
              w.cy < yBottom &&
              !TIME_RANGE_REGEX.test(w.text) &&
              !SINGLE_TIME_REGEX.test(w.text) &&
              w.text.length >= 2
            );

            if (cellWords.length > 0) {
              const cellText = cellWords.map(w => w.text).join(' ');
              const cm = COURSE_CODE_REGEX.exec(cellText);
              const code = cm ? cm[1].replace(/\s+/g, '').toUpperCase() : 'Ders';

              schedule[day].push({
                section: '1',
                code,
                name: code,
                classroom: '',
                instructor: '',
                start_time: row.start,
                end_time: row.end,
                is_lab: false,
              });
            }
          });
        });

        // Aynı gün içindeki ardışık ders saatlerini birleştir (örn: 09:00-09:50 ve 10:00-10:50 -> 09:00-10:50)
        WEEKDAYS.forEach(day => {
          const slots = schedule[day];
          if (slots.length <= 1) return;

          slots.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
          const merged: any[] = [];

          slots.forEach(slot => {
            if (merged.length === 0) {
              merged.push({ ...slot });
              return;
            }
            const prev = merged[merged.length - 1];
            const prevEndMin = toMinutes(prev.end_time);
            const currStartMin = toMinutes(slot.start_time);

            // Eğer bitiş ile başlangıç arasında <= 15 dk fark varsa birleştir
            if (currStartMin - prevEndMin <= 15 && currStartMin >= prevEndMin - 10) {
              prev.end_time = slot.end_time;
            } else {
              merged.push({ ...slot });
            }
          });

          schedule[day] = merged;
        });
      }
    }

    // Courses Summary Oluştur
    const coursesSummaryMap: Record<string, any> = {};
    Object.entries(schedule).forEach(([day, items]) => {
      items.forEach(it => {
        const key = `${it.code}_${day}_${it.start_time}`;
        if (!coursesSummaryMap[key]) {
          coursesSummaryMap[key] = {
            code: it.code,
            name: it.name || it.code,
            section: it.section || '1',
            instructor: '',
            classrooms: [],
            time_slots: [
              {
                day,
                start_time: it.start_time,
                end_time: it.end_time,
                classroom: it.classroom || '',
                is_lab: it.is_lab || false,
              },
            ],
          };
        }
      });
    });

    const totalCoursesFound = Object.values(schedule).reduce((acc, list) => acc + list.length, 0);
    if (totalCoursesFound === 0) {
      throw new Error('Görselde ders saatleri okunamadı.');
    }

    return {
      student_id: 'Görsel',
      student_name: 'Ders Programı',
      term: 'Aktif Dönem',
      title: 'YTÜ Ders Programı',
      schedule,
      courses_summary: Object.values(coursesSummaryMap),
    };
  } catch (err: any) {
    console.error('OCR Error:', err);
    throw new Error(err.message || 'Görsel üzerindeki ders programı okunamadı.');
  }
}
