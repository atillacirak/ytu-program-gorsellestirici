import codecs
path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content = codecs.open(path, 'r', 'utf-8').read()

old_map = "Object.keys(GRADE_WEIGHTS).map(grade => ("
new_map = "Object.keys(GRADE_WEIGHTS).filter(g => !['G', 'K', 'İ'].includes(g) || g === course.expectedGrade).map(grade => ("
content = content.replace(old_map, new_map)

codecs.open(path, 'w', 'utf-8').write(content)
