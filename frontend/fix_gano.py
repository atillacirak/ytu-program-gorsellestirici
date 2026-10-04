import codecs
path = r'C:\Projeler\Ytü Görselleştir\frontend\src\app\gano\page.tsx'
content = codecs.open(path, 'r', 'utf-8').read()
old = '''                </h1>
              </div>
            </div>'''
new = '''                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                YTÜ'lülerin yeni nesil ders ve not yönetim portalı.
              </p>
            </div>'''
content = content.replace(old, new)
codecs.open(path, 'w', 'utf-8').write(content)
