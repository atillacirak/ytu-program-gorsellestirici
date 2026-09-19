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
  { start: '08:00', end: '08:50' },
  { start: '09:00', end: '09:50' },
  { start: '10:00', end: '10:50' },
  { start: '11:00', end: '11:50' },
  { start: '12:00', end: '12:50' },
  { start: '13:00', end: '13:50' },
  { start: '14:00', end: '14:50' },
  { start: '15:00', end: '15:50' },
  { start: '16:00', end: '16:50' },
  { start: '17:00', end: '17:50' },
  { start: '18:00', end: '18:50' },
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

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.replace('.', ':').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
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

/**
 * Görseldeki dolu ders saatlerini ve günlerini geometrik ızgara ve kart blok
 * gruplamasıyla hatasız çıkarır.
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

    const bodyWords = rawWords.filter(w => w.top > headerBottomY);

    // 2. Tablo Dikey Izgara Hesaplama
    const bodyBottomY = Math.max(...bodyWords.map(w => w.top + w.h), imgH * 0.9);
    const tableTopY = headerBottomY + 5;
    const tableBottomY = bodyBottomY + 10;
    const tableHeight = tableBottomY - tableTopY;
    const numRows = STANDARD_HOURS.length; // 11
    const rowHeight = tableHeight / numRows;

    function yToHourIndex(y: number): number {
      const rawIdx = (y - tableTopY) / rowHeight;
      return Math.max(0, Math.min(numRows - 1, Math.floor(rawIdx)));
    }

    const schedule: Record<string, any[]> = {};
    ALL_DAYS.forEach(d => { schedule[d] = []; });

    // 3. Her Gün Sütunundaki Kelimeleri Kart Blokları Olarak Grupla
    WEEKDAYS.forEach(day => {
      const col = dayColBounds[day];
      if (!col) return;

      const colWords = bodyWords
        .filter(w => w.cx >= col.xmin + 5 && w.cx < col.xmax - 5)
        .sort((a, b) => a.top - b.top);

      if (colWords.length === 0) return;

      const cardBlocks: WordBox[][] = [];
      let currentBlock: WordBox[] = [colWords[0]];

      for (let i = 1; i < colWords.length; i++) {
        const prevWord = currentBlock[currentBlock.length - 1];
        const currWord = colWords[i];
        const verticalGap = currWord.top - (prevWord.top + prevWord.h);

        if (verticalGap <= rowHeight * 1.15) {
          currentBlock.push(currWord);
        } else {
          cardBlocks.push(currentBlock);
          currentBlock = [currWord];
        }
      }
      if (currentBlock.length > 0) {
        cardBlocks.push(currentBlock);
      }

      cardBlocks.forEach(block => {
        const blockTop = Math.min(...block.map(w => w.top));
        const blockBottom = Math.max(...block.map(w => w.top + w.h));

        const startIdx = yToHourIndex(blockTop + 5);
        const endIdx = yToHourIndex(blockBottom - 5);

        const startTime = STANDARD_HOURS[startIdx].start;
        const endTime = STANDARD_HOURS[Math.max(startIdx, endIdx)].end;

        const blockText = block.map(w => w.text).join(' ');
        const cm = COURSE_CODE_REGEX.exec(blockText);
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

      // Bitişik / 1 saatten az boşluklu aynı blok parçalarını birleştir
      const slots = schedule[day];
      if (slots.length > 1) {
        slots.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
        const merged: any[] = [];
        slots.forEach(slot => {
          if (merged.length === 0) {
            merged.push({ ...slot });
            return;
          }
          const prev = merged[merged.length - 1];
          const prevEnd = toMinutes(prev.end_time);
          const currStart = toMinutes(slot.start_time);

          if (currStart <= prevEnd + 65) {
            prev.end_time = slot.end_time;
            if (slot.code !== 'Ders' && prev.code === 'Ders') prev.code = slot.code;
          } else {
            merged.push({ ...slot });
          }
        });
        schedule[day] = merged;
      }
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
