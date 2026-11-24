import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRemainingWeightToItem,
  calculateWeightedClassAverage,
  calculateWeightedScore,
  createDefaultCourseProfile,
  evaluateAbsoluteGrade,
  evaluateCourseGrade,
  getRelativeClassLevel,
  normalizeWeightsTo100,
  solveRequiredScoresForTargetGrades
} from './harfNotuUtils';

test('Standart 2 Vize + Final (%30/%30/%40) ağırlıklı ortalama hesabı', () => {
  const course = createDefaultCourseProfile();
  assert.equal(course.items.length, 3);
  assert.deepEqual(
    course.items.map((i) => i.weight),
    [30, 30, 40]
  );

  course.items[0].score = 80; // 24
  course.items[1].score = 70; // 21
  course.items[2].score = 90; // 36 -> toplam 81

  const stats = calculateWeightedScore(course.items);
  assert.equal(stats.totalWeight, 100);
  assert.equal(stats.completedWeight, 100);
  assert.equal(stats.hbn, 81);
  assert.equal(stats.completedAverage, 81);

  const evalRes = evaluateCourseGrade(course);
  assert.equal(evalRes.effectiveMode, 'absolute');
  assert.equal(evalRes.primaryGrade, 'BB');
  assert.equal(evalRes.gpaPoint, 3.0);
});

test('Vize 2 silinip Proje eklendiğinde ağırlık dengeleme ve kalan ekleme tam %100 üretir', () => {
  const course = createDefaultCourseProfile();
  // Vize 2 çıkar (%30 + %40 = %70)
  const withoutVize2 = course.items.filter((i) => i.label !== 'Vize 2');
  assert.equal(withoutVize2.reduce((a, b) => a + b.weight, 0), 70);

  // Proje ekle (%20 -> toplam %90)
  const withProject = [
    ...withoutVize2,
    { id: 'proj_1', label: 'Proje', type: 'project' as const, weight: 20, score: null, classAvg: null }
  ];

  // Orantılı %100'e dengele
  const normalized = normalizeWeightsTo100(withProject);
  const sumNormalized = normalized.reduce((a, b) => a + b.weight, 0);
  assert.equal(sumNormalized, 100);
  assert.deepEqual(
    normalized.map((i) => i.weight),
    [33, 45, 22]
  );

  // Kalanı Final'e ekle (%70 + %20 = %90 -> Final %40 + %10 = %50)
  const finalItem = withProject.find((i) => i.type === 'final')!;
  const assigned = assignRemainingWeightToItem(withProject, finalItem.id);
  assert.equal(assigned.reduce((a, b) => a + b.weight, 0), 100);
  assert.equal(assigned.find((i) => i.id === finalItem.id)?.weight, 50);

  // Tüm ağırlıklar 0 iken dahi toplam tam 100 olmalı
  const allZero = withProject.map((i) => ({ ...i, weight: 0 }));
  const normZero = normalizeWeightsTo100(allZero);
  assert.equal(normZero.reduce((a, b) => a + b.weight, 0), 100);
});

test('Final boş bırakıldığında Final barajı yanlış FF üretmez ve mevcut tempo projeksiyonu doğru hesaplanır', () => {
  const course = createDefaultCourseProfile();
  course.items[0].score = 80; // %30
  course.items[1].score = 60; // %30
  // Final null (%40) -> (80*30 + 60*30) / 60 = 70.00
  const evalRes = evaluateCourseGrade(course);
  assert.equal(evalRes.completedWeight, 60);
  assert.equal(evalRes.completedAverage, 70);
  assert.equal(evalRes.earnedContribution, 42);
  assert.equal(evalRes.isProjected, true);
  assert.equal(evalRes.hbn, 70);
  assert.equal(evalRes.primaryGrade, 'CC');
  assert.equal(evalRes.barajViolation.violated, false);

  // Final = 50 girildiğinde projeksiyon kapanır: (2400 + 1800 + 2000)/100 = 62.00
  course.items[2].score = 50;
  const fullRes = evaluateCourseGrade(course);
  assert.equal(fullRes.isProjected, false);
  assert.equal(fullRes.hbn, 62);
  assert.equal(fullRes.primaryGrade, 'DC');
});

test('YTÜ Bağıl Değerlendirme (T-Skoru), sınıf düzeyleri ve 3lü standart sapma bandı', () => {
  assert.equal(getRelativeClassLevel(72).label, 'Mükemmel');
  assert.equal(getRelativeClassLevel(65).label, 'Çok İyi');
  assert.equal(getRelativeClassLevel(60).label, 'İyi');
  assert.equal(getRelativeClassLevel(55).label, 'Ortanın Üstü');
  assert.equal(getRelativeClassLevel(50).label, 'Orta');
  assert.equal(getRelativeClassLevel(45).label, 'Zayıf');
  assert.equal(getRelativeClassLevel(35).label, 'Kötü');

  // HBN > Ort durumu: σ=10 en yüksek harfi, σ=20 en düşük harfi verir
  const aboveCourse = createDefaultCourseProfile({ stdDev: null });
  aboveCourse.items[0].score = 75;
  aboveCourse.items[0].classAvg = 55;
  aboveCourse.items[1].score = 75;
  aboveCourse.items[1].classAvg = 60;
  aboveCourse.items[2].score = 75;
  aboveCourse.items[2].classAvg = 60;
  // Ağırlıklı Ort = 55*0.3 + 60*0.3 + 60*0.4 = 58.5 (İyi düzey: AA>=63, BA>=58, BB>=53, CB>=48)
  const avgStats = calculateWeightedClassAverage(aboveCourse.items);
  assert.equal(avgStats.weightedClassAvg, 58.5);

  const resAbove = evaluateCourseGrade(aboveCourse);
  assert.equal(resAbove.effectiveMode, 'relative');
  assert.equal(resAbove.classLevel?.label, 'İyi');
  assert.equal(resAbove.bands.length, 3);
  // HBN=75, Ort=58.5 => fark=+16.5:
  // σ=10 -> T=66.5 (AA), σ=15 -> T=61.0 (BA), σ=20 -> T=58.25 (BA)
  assert.equal(resAbove.minGrade, 'BA');
  assert.equal(resAbove.maxGrade, 'AA');
  assert.equal(resAbove.gradeRangeLabel, 'BA – AA');

  // HBN < Ort durumu: σ=10 en DÜŞÜK harfi, σ=20 en YÜKSEK harfi verir (sıra tersine dönmemeli!)
  const belowCourse = createDefaultCourseProfile({ stdDev: null });
  belowCourse.items[0].score = 45;
  belowCourse.items[0].classAvg = 60;
  belowCourse.items[1].score = 45;
  belowCourse.items[1].classAvg = 60;
  belowCourse.items[2].score = 45;
  belowCourse.items[2].classAvg = 60;
  // HBN=45, Ort=60 (İyi düzey): fark=-15
  // σ=10 -> T=35 (DD), σ=15 -> T=40 (DC), σ=20 -> T=42.5 (DC)
  const resBelow = evaluateCourseGrade(belowCourse);
  assert.equal(resBelow.minGrade, 'DD');
  assert.equal(resBelow.maxGrade, 'DC');
  assert.equal(resBelow.gradeRangeLabel, 'DD – DC');
});

test('Final barajı (<40) ve HBN alt sınırı (<30) yüksek vizeye rağmen otomatik FF üretir; Bütünleme finalin yerine geçer', () => {
  const course = createDefaultCourseProfile({ useFinalBaraj: true, finalBarajScore: 40 });
  course.items[0].score = 100;
  course.items[1].score = 100;
  course.items[2].score = 35; // HBN = 74 ama Final < 40!

  const res = evaluateCourseGrade(course);
  assert.equal(res.hbn, 74);
  assert.equal(res.barajViolation.violated, true);
  assert.equal(res.barajViolation.reason, 'final');
  assert.equal(res.primaryGrade, 'FF');
  assert.equal(res.gpaPoint, 0);

  // Bütünleme 60 girilirse final barajı yerine bütünleme esas alınır
  course.items.push({
    id: 'but_1',
    label: 'Bütünleme',
    type: 'makeup',
    weight: 40,
    score: 60,
    classAvg: null
  });
  // Final weight'i 0 yapıp büt ile değiştirilmiş senaryo (100*0.3 + 100*0.3 + 60*0.4 = 84 -> BB)
  course.items[2].weight = 0;
  const resMakeup = evaluateCourseGrade(course);
  assert.equal(resMakeup.hbn, 84);
  assert.equal(resMakeup.barajViolation.violated, false);
  assert.equal(resMakeup.primaryGrade, 'BB');

  // HBN alt sınırı (<30 -> FF)
  const lowCourse = createDefaultCourseProfile({ useFinalBaraj: false, useHbnFloor: true, hbnFloorScore: 30 });
  lowCourse.items[0].score = 20;
  lowCourse.items[1].score = 20;
  lowCourse.items[2].score = 40; // HBN = 6+6+16 = 28 < 30
  const lowRes = evaluateCourseGrade(lowCourse);
  assert.equal(lowRes.hbn, 28);
  assert.equal(lowRes.barajViolation.violated, true);
  assert.equal(lowRes.barajViolation.reason, 'hbn');
  assert.equal(lowRes.primaryGrade, 'FF');
});

test('Mutlak katalog değerlendirmesi ve Hedef Puan Çözücü (AA..DD)', () => {
  assert.equal(evaluateAbsoluteGrade(90, { AA: 90, BA: 85, BB: 80, CB: 75, CC: 70, DC: 60, DD: 50, FD: 40 }), 'AA');
  assert.equal(evaluateAbsoluteGrade(39.9, { AA: 90, BA: 85, BB: 80, CB: 75, CC: 70, DC: 60, DD: 50, FD: 40 }), 'FF');

  const course = createDefaultCourseProfile({ useFinalBaraj: true, finalBarajScore: 40 });
  course.items[0].score = 50; // 15
  course.items[1].score = 50; // 15 -> mevcut katkı 30, Final %40 boş
  // AA (90) için gereken: (90 - 30) / 0.4 = 150 -> impossible
  // DD (50) için gereken: (50 - 30) / 0.4 = 50 -> achievable
  const targets = solveRequiredScoresForTargetGrades(course, course.items[2].id);
  const aa = targets.find((t) => t.grade === 'AA')!;
  const dd = targets.find((t) => t.grade === 'DD')!;
  assert.equal(aa.status, 'impossible');
  assert.equal(aa.requiredScore, 150);
  assert.equal(dd.status, 'achievable');
  assert.equal(dd.requiredScore, 50);

  // Çok yüksek vizelerle cebirsel DD < 40 olsa bile Final barajı (>= 40) kısıtı görünmeli
  course.items[0].score = 95;
  course.items[1].score = 95; // katkı = 57
  const highTargets = solveRequiredScoresForTargetGrades(course, course.items[2].id);
  const highDd = highTargets.find((t) => t.grade === 'DD')!;
  assert.equal(highDd.requiredScore, 40);
  assert.equal(highDd.limitedByBaraj, true);
  assert.equal(highDd.status, 'achievable');

  // Bağıl modda hedef puan çözücü aralık döndürür
  course.items[0].classAvg = 55;
  course.items[1].classAvg = 55;
  const relTargets = solveRequiredScoresForTargetGrades(course, course.items[2].id);
  const relAa = relTargets.find((t) => t.grade === 'AA')!;
  assert.ok(relAa.minBandScore !== undefined && relAa.maxBandScore !== undefined);
});

test('Başka kalemde Final baraj ihlali varken Vize hedef çözücü tüm geçer notları impossible/blockedByOtherBaraj işaretler, ancak Bütünleme barajı aşabilir', () => {
  const course = createDefaultCourseProfile({ useFinalBaraj: true, finalBarajScore: 40 });
  course.items[0].score = 90; // Vize 1
  course.items[1].score = null; // Vize 2 boş
  course.items[2].score = 30; // Final < 40 (baraj ihlali!)

  const vize2Targets = solveRequiredScoresForTargetGrades(course, course.items[1].id);
  assert.equal(vize2Targets.length, 7);
  for (const row of vize2Targets) {
    assert.equal(row.status, 'impossible');
    assert.equal(row.blockedByOtherBaraj, true);
  }

  // Bütünleme eklenirse ve hedef kalem Bütünleme seçilirse Final barajı Bütünlemeyi bloklamaz
  course.items.push({
    id: 'makeup_target',
    label: 'Bütünleme',
    type: 'makeup',
    weight: 40,
    score: null,
    classAvg: null
  });
  course.items[2].weight = 0; // Final yerine Büt
  course.items[1].score = 80;
  const makeupTargets = solveRequiredScoresForTargetGrades(course, 'makeup_target');
  const makeupDd = makeupTargets.find((t) => t.grade === 'DD')!;
  assert.equal(makeupDd.blockedByOtherBaraj, undefined);
  assert.equal(makeupDd.status, 'achievable');
  assert.equal(makeupDd.requiredScore, 40);
});
