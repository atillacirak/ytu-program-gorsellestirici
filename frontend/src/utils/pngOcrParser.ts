import { createWorker } from 'tesseract.js';

export interface ParsedScheduleData {
  student_id: string;
  student_name: string;
  term: string;
  title: string;
  schedule: Record<string, any[]>;
  courses_summary: any[];
}

/**
 * Metadata barındırmayan herhangi bir ders programı PNG görselini
 * OCR ile tarayarak Gün/Saat ve Ders Kodlarını otomatik ayrıştırır.
 */
export async function parseScheduleImageWithOcr(imageFile: File): Promise<ParsedScheduleData> {
  const worker = await createWorker('tur+eng');

  try {
    const imageUrl = URL.createObjectURL(imageFile);
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    const fullText = ret.data.text || '';
    const blocks = (ret.data as any).blocks || [];
    const lines: any[] = [];
    const words: any[] = [];

    blocks.forEach((b: any) => {
      if (b.paragraphs) {
        b.paragraphs.forEach((p: any) => {
          if (p.lines) {
            p.lines.forEach((l: any) => {
              lines.push(l);
              if (l.words) {
                l.words.forEach((w: any) => words.push(w));
              }
            });
          }
        });
      }
    });

    // Varsayılan boş program yapısı
    const schedule: Record<string, any[]> = {
      'Pazartesi': [],
      'Salı': [],
      'Çarşamba': [],
      'Perşembe': [],
      'Cuma': [],
      'Cumartesi': [],
      'Pazar': []
    };

    // Ders Kodu Regex'i (Örn: BLM1011, MAT1071, FIZ1001, KIM1001, MDB1031 vb.)
    const courseCodeRegex = /([A-ZÇĞİÖŞÜ0-9_]{2,8}\d{3,4})/gi;

    // Satır bazlı arama ve parsing
    const foundCourses: { code: string; lineText: string; bbox?: any }[] = [];

    lines.forEach((line: any) => {
      const lineStr = line.text || '';
      const matches = lineStr.match(courseCodeRegex);
      if (matches) {
        matches.forEach((code: string) => {
          foundCourses.push({
            code: code.toUpperCase(),
            lineText: lineStr.trim(),
            bbox: line.bbox
          });
        });
      }
    });

    // Eğer ders kodları regex ile bulunamadıysa düz metinde regex dene
    if (foundCourses.length === 0) {
      const allMatches = fullText.match(courseCodeRegex);
      if (allMatches) {
        allMatches.forEach((code: string) => {
          foundCourses.push({
            code: code.toUpperCase(),
            lineText: code
          });
        });
      }
    }

    // Gün ve Saat Tespiti
    const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const detectedDays: { day: string; x0: number; x1: number }[] = [];

    // Başlık alanındaki günlerin x koordinatlarını bulma
    words.forEach((w: any) => {
      const wText = (w.text || '').trim();
      DAYS.forEach((day) => {
        if (wText.toLocaleLowerCase('tr').includes(day.toLocaleLowerCase('tr'))) {
          if (w.bbox) {
            detectedDays.push({
              day,
              x0: w.bbox.x0,
              x1: w.bbox.x1
            });
          }
        }
      });
    });

    // Dersleri tespit edilen günlere dağıt
    const coursesSummaryMap: Record<string, any> = {};

    lines.forEach((line: any) => {
      const lineStr = line.text || '';
      const mCode = lineStr.match(courseCodeRegex);
      if (!mCode) return;

      const code = mCode[0].toUpperCase();
      const lineX = line.bbox ? (line.bbox.x0 + line.bbox.x1) / 2 : 0;

      // En yakın günü bul
      let targetDay = 'Pazartesi';
      if (detectedDays.length > 0) {
        let minDist = Infinity;
        detectedDays.forEach((d) => {
          const dayCenterX = (d.x0 + d.x1) / 2;
          const dist = Math.abs(lineX - dayCenterX);
          if (dist < minDist) {
            minDist = dist;
            targetDay = d.day;
          }
        });
      } else {
        // Eğer gün başlığı OCR ile tam seçilemediyse metindeki gün adını ara
        for (const d of DAYS) {
          if (lineStr.toLocaleLowerCase('tr').includes(d.toLocaleLowerCase('tr'))) {
            targetDay = d;
            break;
          }
        }
      }

      // Saat aralığı tespiti (Örn: 09:00 - 10:50 veya 09:00)
      const timeMatch = lineStr.match(/(\d{1,2}[\.:]\d{2})\s*[-–]?\s*(\d{1,2}[\.:]\d{2})?/);
      let startTime = '09:00';
      let endTime = '10:50';

      if (timeMatch) {
        startTime = timeMatch[1].replace('.', ':');
        if (timeMatch[2]) {
          endTime = timeMatch[2].replace('.', ':');
        } else {
          // Varsayılan 2 saatlik ders bloğu
          const startH = parseInt(startTime.split(':')[0], 10) || 9;
          endTime = `${startH + 1}:50`;
        }
      }

      // Derslik Tespiti (Örn: A-101, CZ-01, Amfi 2 vb.)
      const classroomMatch = lineStr.match(/([A-Z0-9\-\.\s]{2,12}\s*(?:LAB|Amfi|Derslik)?)/i);
      const classroom = classroomMatch ? classroomMatch[1].trim() : 'Derslik';

      const courseItem = {
        section: '1',
        code,
        name: code,
        classroom,
        instructor: '',
        start_time: startTime,
        end_time: endTime,
        is_lab: /lab/i.test(classroom) || /lab/i.test(lineStr)
      };

      if (!schedule[targetDay]) {
        schedule[targetDay] = [];
      }
      schedule[targetDay].push(courseItem);

      const ckey = code;
      if (!coursesSummaryMap[ckey]) {
        coursesSummaryMap[ckey] = {
          code,
          name: code,
          section: '1',
          instructor: '',
          classrooms: new Set(),
          time_slots: []
        };
      }
      coursesSummaryMap[ckey].classrooms.add(classroom);
      coursesSummaryMap[ckey].time_slots.push({
        day: targetDay,
        start_time: startTime,
        end_time: endTime,
        classroom,
        is_lab: courseItem.is_lab
      });
    });

    const coursesSummary = Object.values(coursesSummaryMap).map((c: any) => ({
      ...c,
      classrooms: Array.from(c.classrooms)
    }));

    return {
      student_id: 'Görsel',
      student_name: 'Öğrenci (Görsel)',
      term: 'Aktif Dönem',
      title: 'PNG Ders Programı',
      schedule,
      courses_summary: coursesSummary
    };
  } catch (err) {
    console.error('OCR Parsing Error:', err);
    throw new Error('Görsel üzerindeki ders yazıları okunamadı. Lütfen görselin net ve kaliteli olduğundan veya Report.pdf belgesi yüklediğinizden emin olun.');
  }
}
