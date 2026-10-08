with open('frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                                <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                  {c.code}
                                </td>'''

replacement = '''                                <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {c.code}
                                    <a 
                                      href="https://ytuhocalar.com.tr" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="p-1 rounded-full text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors no-export no-print inline-flex items-center justify-center"
                                      title="YTÜ Hocalar'da Değerlendirmelere Bak"
                                    >
                                      <MessageCircle size={14} strokeWidth={2.5} />
                                    </a>
                                  </div>
                                </td>'''

if target in content:
    content = content.replace(target, replacement)
    print("Replaced in table view")
else:
    print("Target not found for table view")

with open('frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
