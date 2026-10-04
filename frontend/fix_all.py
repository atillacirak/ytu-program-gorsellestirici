import codecs
path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content = codecs.open(path, 'r', 'utf-8').read()

old_subtitle = "              </div>\n            </div>\n          </a>"
new_subtitle = """              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                YTÜ&apos;lülerin yeni nesil ders ve not yönetim portalı.
              </p>
            </div>
          </a>"""
content = content.replace(old_subtitle, new_subtitle)

old_map = "Object.keys(GRADE_WEIGHTS).map(grade => ("
new_map = "Object.keys(GRADE_WEIGHTS).filter(g => !['G', 'K', 'İ'].includes(g) || g === course.expectedGrade).map(grade => ("
content = content.replace(old_map, new_map)

codecs.open(path, 'w', 'utf-8').write(content)
