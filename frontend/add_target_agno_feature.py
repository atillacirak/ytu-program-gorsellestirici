path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\agno\page.tsx'
content = open(path, encoding='utf-8').read()

# 1. Add Target icon to Lucide imports
content = content.replace('  Users\n} from \'lucide-react\';', '  Users,\n  Target\n} from \'lucide-react\';')

# 2. Add Target GPA states & memo inside component
state_code = '''  // Past state
  const [pastCgpa, setPastCgpa] = useState<string>('');
  const [pastTotalCredits, setPastTotalCredits] = useState<string>('');
  const [pastCourses, setPastCourses] = useState<ScenarioCourse[]>([]);

  // Target GPA State
  const [targetCgpa, setTargetCgpa] = useState<string>('3.20');
  const [nextSemesterCredits, setNextSemesterCredits] = useState<string>('16');'''

content = content.replace('''  // Past state
  const [pastCgpa, setPastCgpa] = useState<string>('');
  const [pastTotalCredits, setPastTotalCredits] = useState<string>('');
  const [pastCourses, setPastCourses] = useState<ScenarioCourse[]>([]);''', state_code)

# 3. Add targetCalculation memo
calc_code = '''  const targetCalculation = useMemo(() => {
    const cgpa = parseFloat(pastCgpa.replace(',', '.'));
    const pastCredits = parseFloat(pastTotalCredits.replace(',', '.'));
    const target = parseFloat(targetCgpa.replace(',', '.'));
    const nextCredits = parseFloat(nextSemesterCredits.replace(',', '.'));

    if (isNaN(cgpa) || isNaN(pastCredits) || isNaN(target) || isNaN(nextCredits) || pastCredits <= 0 || nextCredits <= 0) {
      return null;
    }

    const totalCreditsNext = pastCredits + nextCredits;
    const totalRequiredPoints = target * totalCreditsNext;
    const currentPoints = cgpa * pastCredits;
    const requiredPointsNext = totalRequiredPoints - currentPoints;
    const requiredYano = requiredPointsNext / nextCredits;

    return {
      requiredYano,
      target,
      nextCredits,
      isPossible: requiredYano <= 4.00 && requiredYano >= 0,
      isAlreadyAchieved: requiredYano < 0
    };
  }, [pastCgpa, pastTotalCredits, targetCgpa, nextSemesterCredits]);'''

# Place targetCalculation memo right after calculatedGpa memo
content = content.replace('  return {\n      newCgpa: newCgpa,\n      termGpa: termGpa,\n      totalCredits: totalCredits,\n      termCredits: termCredits\n    };\n  }, [pastCgpa, pastTotalCredits, currentCourses]);',
                          '  return {\n      newCgpa: newCgpa,\n      termGpa: termGpa,\n      totalCredits: totalCredits,\n      termCredits: termCredits\n    };\n  }, [pastCgpa, pastTotalCredits, currentCourses]);\n\n' + calc_code)

# 4. Target GPA Card UI HTML
target_card_ui = '''        {/* Target GPA Goal Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base">
            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
              <Target size={18} />
            </div>
            <span>Hedefine ulaşmak için ne gerekiyor?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Hedef AGNO</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                placeholder="3.20"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-sm"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Gelecek Dönem Kredi</label>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder="16"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-sm"
                value={nextSemesterCredits}
                onChange={(e) => setNextSemesterCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setTargetCgpa('2.72')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.72' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Çift anadal 2,72
            </button>
            <button
              onClick={() => setTargetCgpa('2.50')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.50' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Yandal 2,50
            </button>
            <button
              onClick={() => setTargetCgpa('2.40')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.40' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Erasmus 2,40
            </button>
            <button
              onClick={() => setTargetCgpa('3.00')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '3.00' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Onur Öğrencisi 3,00
            </button>
          </div>

          {targetCalculation ? (
            targetCalculation.isAlreadyAchieved ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
                🎉 Mevcut AGNO&apos;n zaten bu hedefin üzerinde! Gelecek dönem ortalaman 0.00 gelse dahi AGNO&apos;n <strong>{targetCalculation.target.toFixed(2)}</strong> altına düşmez.
              </div>
            ) : targetCalculation.isPossible ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
                Gelecek dönem <strong>{targetCalculation.nextCredits}</strong> kredide ortalama <strong>{targetCalculation.requiredYano.toFixed(2)}</strong> yaparsan AGNO&apos;n <strong>{targetCalculation.target.toFixed(2)}</strong> olur.
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs sm:text-sm font-medium">
                ⚠️ Bu hedefe <strong>{targetCalculation.nextCredits}</strong> kredide ulaşmak için ortalamanın <strong>{targetCalculation.requiredYano.toFixed(2)}</strong> olması gerekir (4.00 üstü). Tek dönemde ulaşmak mümkün değil.
              </div>
            )
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs">
              💡 Hesaplamayı görmek için yukarıdaki &quot;Geçmiş Durum&quot; kartından mevcut AGNO ve tamamlanan kredinizi girin.
            </div>
          )}
        </div>'''

# Insert target_card_ui after Past GPA Card ends (around line 630)
target_card_marker = '          {(!pastCgpa || !pastTotalCredits) && pastCourses.length === 0 && (\n             <div className="px-5 pb-5 md:px-6 md:pb-6">\n               <div className="bg-[#e7a240]/[0.08] text-[#8a5611] p-2.5 rounded-lg flex gap-2 items-start text-sm border border-[#e7a240]/30">\n                 <AlertCircle size={18} className="shrink-0 mt-0.5" />\n                 <p>Sadece bu dönemin YANO\'sunu hesaplamak istiyorsanız bu alanları boş bırakabilirsiniz.</p>\n               </div>\n             </div>\n          )}\n        </div>'

content = content.replace(target_card_marker, target_card_marker + '\n\n' + target_card_ui)

open(path, 'w', encoding='utf-8').write(content)
print("Target AGNO feature added successfully!")
