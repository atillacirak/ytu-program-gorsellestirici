import { CurriculumCourse, PlanSummary, YearGroup } from '@/types/planlama';

export interface ExportAcademicPlanPdfOptions {
  activeScenarioName: string;
  selectedFaculty: string;
  programName: string;
  yearsList: YearGroup[];
  exemptCourses: CurriculumCourse[];
  summary: PlanSummary;
  limitMetric: 'ects' | 'credits';
  regularMaxLimit: number;
  summerMaxLimit: number;
  summerMaxCourses: number;
  isHighGpa: boolean;
  onPopupBlocked: () => void;
}

export function exportAcademicPlanPdf({
  activeScenarioName,
  selectedFaculty,
  programName,
  yearsList,
  exemptCourses,
  summary,
  limitMetric,
  regularMaxLimit,
  summerMaxLimit,
  summerMaxCourses,
  isHighGpa,
  onPopupBlocked
}: ExportAcademicPlanPdfOptions): void {
  const esc = (str: string) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const unitLabel = limitMetric === 'ects' ? 'AKTS' : 'Kredi';

  const safeScenarioSlug = (activeScenarioName || 'senaryo_1')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  const docTitle = `ytudostun_akademik_plan_${safeScenarioSlug || 'senaryo_1'}`;
  const dateStr = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const yearsHtml = yearsList
    .map(({ year, buckets: yearBuckets }) => {
      const totalYearCourses = yearBuckets.reduce((sum, b) => sum + b.courses.length, 0);
      if (totalYearCourses === 0) return '';

      const activeBuckets = yearBuckets.filter(
        (b) => b.season !== 'Yaz' || b.courses.length > 0
      );
      if (activeBuckets.length === 0) return '';

      const colsClass = activeBuckets.length === 3 ? 'grid-3' : 'grid-2';
      const bucketsHtml = activeBuckets
        .map((b) => {
          const isSum = b.season === 'Yaz';
          const useEcts = !isSum && limitMetric === 'ects';
          const totEcts = b.courses.reduce((s, c) => s + c.ects, 0);
          const totCred = b.courses.reduce((s, c) => s + c.credits, 0);
          const maxLim = b.customLimit ?? (isSum ? summerMaxLimit : regularMaxLimit);
          const curVal = useEcts ? totEcts : totCred;
          const bUnit = useEcts ? 'AKTS' : 'Kredi';

          const rowsHtml =
            b.courses.length === 0
              ? `<tr><td colspan="5" class="empty-row">${
                  b.semesterNumber && b.semesterNumber > summary.maxSem && summary.isEarlyGraduation
                    ? `🎉 ${b.semesterNumber}. Yarıyıl boşaltıldı (${summary.gradYears} Yılda Mezuniyet)`
                    : 'Bu dönemde ders bulunmuyor.'
                }</td></tr>`
              : b.courses
                  .map((c) => {
                    const code = esc(c.selectedElectiveCode || c.code);
                    const name = esc(
                      c.selectedElectiveName
                        ? `${c.selectedElectiveName} (${c.name})`
                        : c.name
                    );
                    const isMoved =
                      b.season === 'Yaz' ||
                      (b.semesterNumber && b.semesterNumber !== c.defaultSemester);
                    const movedTag = isMoved
                      ? `<span class="tag-moved">Normali: ${c.defaultSemester}. YY</span>`
                      : '';
                    const statusBadge = c.completed
                      ? `<span class="tag-done">✓ Verildi</span>`
                      : `<span class="tag-plan">Planlanan</span>`;

                    return `
                      <tr class="${c.completed ? 'row-done' : ''}">
                        <td class="col-code">${code}</td>
                        <td class="col-name">${name} ${movedTag}</td>
                        <td class="col-num">${c.credits}</td>
                        <td class="col-num">${c.ects}</td>
                        <td class="col-status">${statusBadge}</td>
                      </tr>
                    `;
                  })
                  .join('');

          return `
            <div class="sem-card ${isSum ? 'sem-summer' : ''}">
              <div class="sem-header">
                <span class="sem-title">${esc(b.title)}</span>
                <span class="sem-meta">${b.courses.length} Ders · ${totCred} Kr · ${totEcts} AKTS (${curVal}/${maxLim} ${bUnit})</span>
              </div>
              <table class="course-table">
                <thead>
                  <tr>
                    <th style="width:18%">Kod</th>
                    <th style="width:50%">Ders Adı</th>
                    <th style="width:10%;text-align:center">Kr</th>
                    <th style="width:10%;text-align:center">AKTS</th>
                    <th style="width:12%;text-align:right">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          `;
        })
        .join('');

      return `
        <div class="year-block">
          <div class="year-title">${year}. Akademik Yıl ${year === 5 ? '(Uzatma Yılı)' : ''}</div>
          <div class="${colsClass}">
            ${bucketsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  const exemptHtml =
    exemptCourses.length > 0
      ? `
        <div class="year-block">
          <div class="year-title">Muafiyet Havuzu & Transkriptten Verilen Dersler (${exemptCourses.length} Ders · ${summary.exemptCredits} Kredi · ${summary.exemptEcts} AKTS)</div>
          <div class="sem-card">
            <table class="course-table">
              <thead>
                <tr>
                  <th style="width:15%">Kod</th>
                  <th style="width:47%">Ders Adı</th>
                  <th style="width:14%;text-align:center">Normal Dönemi</th>
                  <th style="width:8%;text-align:center">Kredi</th>
                  <th style="width:8%;text-align:center">AKTS</th>
                  <th style="width:8%;text-align:right">Not/Durum</th>
                </tr>
              </thead>
              <tbody>
                ${exemptCourses
                  .map(
                    (c) => `
                  <tr>
                    <td class="col-code">${esc(c.selectedElectiveCode || c.code)}</td>
                    <td class="col-name">${esc(
                      c.selectedElectiveName
                        ? `${c.selectedElectiveName} (${c.name})`
                        : c.name
                    )}</td>
                    <td class="col-num">${c.defaultSemester}. Yarıyıl</td>
                    <td class="col-num">${c.credits}</td>
                    <td class="col-num">${c.ects}</td>
                    <td class="col-status"><span class="tag-done">${esc(c.grade || 'Muaf')}</span></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
      : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.35;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(10px);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }
    .toolbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.18);
      border: 1px solid rgba(96, 165, 250, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #60a5fa;
      flex-shrink: 0;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-btn-download {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      transition: all 0.15s ease;
    }
    .toolbar-btn-download:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
    }
    .toolbar-btn-download:disabled { opacity: 0.7; cursor: wait; transform: none; }
    .toolbar-btn-print {
      background: #0c3f79;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 2px 8px rgba(12, 63, 121, 0.35);
      transition: all 0.15s ease;
    }
    .toolbar-btn-print:hover {
      background: #13529c;
      transform: translateY(-1px);
    }
    .toolbar-close {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 8px 14px;
      border-radius: 9px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .toolbar-close:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin-icon { animation: spin 0.9s linear infinite; }
    .sheet {
      max-width: 210mm;
      margin: 14px auto;
      background: #fff;
      padding: 10mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { margin: 0; padding: 0; box-shadow: none; max-width: 100%; }
    }
    .header {
      background: #0c3f79;
      color: #fff;
      padding: 12px 16px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .header h1 { margin: 0; font-size: 15px; font-weight: 800; }
    .header p { margin: 2px 0 0; font-size: 10px; color: #bfdbfe; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .sum-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      padding: 7px 10px;
    }
    .sum-label { font-size: 8.5px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .sum-val { font-size: 12px; font-weight: 800; color: #0c3f79; margin-top: 2px; }
    .sum-sub { font-size: 8.5px; color: #475569; margin-top: 1px; }
    .year-block {
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .year-title {
      font-size: 11px;
      font-weight: 800;
      color: #0c3f79;
      border-bottom: 2px solid #0c3f79;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .sem-card {
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      overflow: hidden;
      background: #fff;
      break-inside: avoid;
    }
    .sem-summer { border-color: #f59e0b; }
    .sem-header {
      background: #f1f5f9;
      padding: 5px 8px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
    }
    .sem-summer .sem-header { background: #fef3c7; border-bottom-color: #f59e0b; }
    .sem-title { font-weight: 800; font-size: 9.5px; color: #0f172a; }
    .sem-meta { font-size: 8px; font-weight: 700; color: #475569; }
    .course-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    .course-table th {
      background: #f8fafc;
      color: #475569;
      text-align: left;
      padding: 3.5px 6px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 700;
    }
    .course-table td {
      padding: 3.5px 6px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .course-table tr:last-child td { border-bottom: none; }
    .row-done td { color: #64748b; background: #f0fdf4; }
    .col-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; color: #0f172a; white-space: nowrap; }
    .col-name { color: #1e293b; font-weight: 600; }
    .col-num { text-align: center; font-family: ui-monospace, monospace; font-weight: 700; }
    .col-status { text-align: right; white-space: nowrap; }
    .tag-moved {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      border-radius: 3px;
      padding: 0 3px;
      font-size: 7.5px;
      font-weight: 700;
      margin-left: 3px;
    }
    .tag-done {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      border-radius: 3px;
      padding: 0.5px 4px;
      font-size: 7.5px;
      font-weight: 700;
    }
    .tag-plan {
      display: inline-block;
      background: #e2e8f0;
      color: #334155;
      border-radius: 3px;
      padding: 0.5px 4px;
      font-size: 7.5px;
      font-weight: 600;
    }
    .empty-row {
      text-align: center;
      color: #64748b;
      padding: 12px !important;
      font-style: italic;
    }
    .footer {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #64748b;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-brand">
      <div class="toolbar-brand-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </div>
      <div>
        <div style="font-size:12.5px;font-weight:800;letter-spacing:-0.01em">YTÜ Akademik Plan PDF Önizleme (${esc(activeScenarioName)})</div>
        <div style="color:#94a3b8;font-size:10.5px">Planınızı inceleyip doğrudan PDF olarak indirebilir veya yazdırabilirsiniz.</div>
      </div>
    </div>
    <div class="toolbar-actions">
      <button id="download-pdf-btn" class="toolbar-btn-download" onclick="downloadDirectPdf()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>PDF İndir</span>
      </button>
      <button class="toolbar-btn-print" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>Yazdır</span>
      </button>
      <button class="toolbar-close" onclick="window.close()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <span>Kapat</span>
      </button>
    </div>
  </div>
  <div id="pdf-sheet" class="sheet">
    <div class="header">
      <div>
        <h1>YTÜ Akademik Planlama & Mezuniyet Simülasyonu (${esc(activeScenarioName)})</h1>
        <p>${esc(selectedFaculty)} — <strong>${esc(programName)}</strong></p>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;font-weight:800;color:#fcd34d">${summary.gradYears} Yıl (${summary.maxSem}. Yarıyıl)</div>
        <div style="font-size:9px;color:#bfdbfe">${esc(activeScenarioName)} · ${esc(dateStr)}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="sum-box">
        <div class="sum-label">Mezuniyet Süresi</div>
        <div class="sum-val">${summary.gradYears} Yıl (${summary.maxSem} Yarıyıl)</div>
        <div class="sum-sub">${summary.isEarlyGraduation ? '🎉 Erken Mezuniyet Senaryosu' : 'Standart Akademik Plan'}</div>
      </div>
      <div class="sum-box">
        <div class="sum-label">Toplam Planlanan Yük</div>
        <div class="sum-val">${summary.totalPlacedCredits} Kredi · ${summary.totalPlacedEcts} AKTS</div>
        <div class="sum-sub">Toplam ${summary.totalPlacedCount} Ders (${summary.activeSummers} Yaz Okulu)</div>
      </div>
      <div class="sum-box">
        <div class="sum-label">Muafiyet & Verilen</div>
        <div class="sum-val">${summary.exemptCount} Ders (${summary.exemptEcts} AKTS)</div>
        <div class="sum-sub">Toplam Tamamlanan: ${summary.completedEcts} AKTS</div>
      </div>
      <div class="sum-box">
        <div class="sum-label">Dönem & Yaz Sınırları</div>
        <div class="sum-val">Dönem: ${regularMaxLimit} ${unitLabel}</div>
        <div class="sum-sub">${isHighGpa ? 'AGNO ≥ 3.00 (28 Kr)' : 'Standart Sınır'} · Yaz: ${summerMaxCourses} Ders/${summerMaxLimit} Kr</div>
      </div>
    </div>

    ${yearsHtml}
    ${exemptHtml}

    <div class="footer">
      <span>YTÜ Ders Programı Görselleştirici & Akademik Planlama Simülatörü</span>
      <span>${esc(programName)} · ${esc(dateStr)}</span>
    </div>
  </div>
  <script>
    function downloadDirectPdf() {
      var btn = document.getElementById('download-pdf-btn');
      var element = document.getElementById('pdf-sheet');
      if (!element) return;
      if (typeof window.html2pdf === 'undefined') {
        window.print();
        return;
      }
      var origHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<svg class="spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>İndiriliyor...</span>';

      var origMargin = element.style.margin;
      var origShadow = element.style.boxShadow;
      element.style.margin = '0 auto';
      element.style.boxShadow = 'none';

      var opt = {
        margin: [6, 6, 6, 6],
        filename: '${esc(docTitle)}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      window.html2pdf().set(opt).from(element).save().then(function() {
        element.style.margin = origMargin;
        element.style.boxShadow = origShadow;
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }).catch(function() {
        element.style.margin = origMargin;
        element.style.boxShadow = origShadow;
        btn.disabled = false;
        btn.innerHTML = origHtml;
      });
    }
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    onPopupBlocked();
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
