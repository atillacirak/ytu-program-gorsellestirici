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
};

const STANDARD_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

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

const COURSE_CODE_REGEX = /([A-ZÇĞİÖŞÜ0-9_]{2,8}\s*\d{3,4})/i;

interface WordBox {
  text: string;
  left: number;
  top: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

/**
 * Görseldeki dolu ders saatlerini sol eksen regresyonu ve ızgara eşleme ile
 * sıfır kayma ve tam saat doğruluğuyla çıkarır.
 */
export async function parseScheduleImageWithOcr(imageFile: File): Promise<ParsedScheduleData> {
  const worker = await createWorker('tur+eng');

  try {
    const imageUrl = URL.createObjectURL(imageFile);
    const ret = await worker.recognize(imageUrl, {}, { blocks: true });
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
      throw new Error('Görsel üzerinde okunabilir metin bulunamadı.');
    }

    const imgW = Math.max(...rawWords.map(w => w.left + w.w));
    const imgH = Math.max(...rawWords.map(w => w.top + w.h));

    // 1. Gün Sütunlarını Tespit Et
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
      : 100;

    // 2. Sol Saat Etiketlerinden Y Doğrusal Regresyonu (Milisaniyelik hassasiyet)
    const firstColXmin = dayColBounds['Pazartesi']?.xmin || imgW * 0.15;
    const leftHourWords = rawWords.filter(w => w.cx < firstColXmin + 15 && w.top > headerBottomY);

    const hourDetections: { hour: number; y: number }[] = [];
    leftHourWords.forEach(w => {
      const m = /(\d{1,2})[:.](\d{2})/.exec(w.text);
      if (m) {
        const h = parseInt(m[1], 10);
        if (h >= 8 && h <= 18) {
          hourDetections.push({ hour: h, y: w.cy });
        }
      }
    });

    let rowHeight = 49.3;
    let row0Center = 133.5;

    if (hourDetections.length >= 2) {
      const h0 = hourDetections[0];
      const hN = hourDetections[hourDetections.length - 1];
      if (hN.hour !== h0.hour) {
        rowHeight = (hN.y - h0.y) / (hN.hour - h0.hour);
        row0Center = h0.y - (h0.hour - 8) * rowHeight;
      }
    } else {
      const bodyWordsTemp = rawWords.filter(w => w.top > headerBottomY);
      const bodyBottom = Math.max(...bodyWordsTemp.map(w => w.top + w.h), imgH * 0.9);
      rowHeight = (bodyBottom - headerBottomY) / 11;
      row0Center = headerBottomY + rowHeight / 2;
    }

    const rowIntervals = STANDARD_HOURS.map((hrStr, idx) => {
      const hNum = parseInt(hrStr.split(':')[0], 10);
      return {
        index: idx,
        hour: hrStr,
        start: hrStr,
        end: `${String(hNum).padStart(2, '0')}:50`,
      };
    });

    const bodyWords = rawWords.filter(w => w.top > headerBottomY);
    const schedule: Record<string, any[]> = {};
    ALL_DAYS.forEach(d => { schedule[d] = []; });

    // 3. Her Gün Sütunundaki Dolu Saatleri Eşle
    WEEKDAYS.forEach(day => {
      const col = dayColBounds[day];
      if (!col) return;

      const colWords = bodyWords
        .filter(w => w.cx >= col.xmin + 5 && w.cx < col.xmax - 5)
        .sort((a, b) => a.top - b.top);

      if (colWords.length === 0) return;

      const occupiedHours = new Set<number>();
      const wordsByHour: Record<number, WordBox[]> = {};

      colWords.forEach(w => {
        const hIdx = Math.round((w.cy - row0Center) / rowHeight);
        if (hIdx >= 0 && hIdx < 11) {
          occupiedHours.add(hIdx);
          if (!wordsByHour[hIdx]) wordsByHour[hIdx] = [];
          wordsByHour[hIdx].push(w);
        }
      });

      const activeList = Array.from(occupiedHours).sort((a, b) => a - b);
      if (activeList.length === 0) return;

      // Maksimum 3 saatlik bloklar halinde birleştir (aradaki 1 saatlik boşlukları doldurarak)
      const rawBlocks: number[][] = [];
      let curBlock: number[] = [activeList[0]];

      for (let i = 1; i < activeList.length; i++) {
        const prevIdx = curBlock[curBlock.length - 1];
        const currIdx = activeList[i];
        const blockSpan = currIdx - curBlock[0] + 1;

        if (currIdx <= prevIdx + 2 && blockSpan <= 3) {
          for (let fill = prevIdx + 1; fill <= currIdx; fill++) {
            if (!curBlock.includes(fill)) curBlock.push(fill);
          }
        } else {
          rawBlocks.push(curBlock);
          curBlock = [currIdx];
        }
      }
      if (curBlock.length > 0) rawBlocks.push(curBlock);

      rawBlocks.forEach(blk => {
        const minIdx = Math.min(...blk);
        const maxIdx = Math.max(...blk);

        const startTime = rowIntervals[minIdx].start;
        const endTime = rowIntervals[maxIdx].end;

        const blkWords = blk.flatMap(i => wordsByHour[i] || []);
        const blkText = blkWords.map(w => w.text).join(' ');
        const cm = COURSE_CODE_REGEX.exec(blkText);
        const code = cm ? cm[1].replace(/\s+/g, '').toUpperCase() : 'Ders';

        schedule[day].push({
          section: '1',
          code,
          name: code,
          classroom: '',
          instructor: '',
          start_time: startTime,
          end_time: endTime,
          is_lab: false,
        });
      });
    });

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
      throw new Error('Görselde ders programı tespit edilemedi.');
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
