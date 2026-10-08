with open('frontend/src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                                                  </span>
                                                )}
                                              </div>
                                            </div>'''

replacement = '''                                                  </span>
                                                )}

                                                <a 
                                                  href="https://ytuhocalar.com.tr" 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="p-[3px] rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600 transition-colors no-export no-print flex items-center justify-center shrink-0 shadow-sm"
                                                  title="YTÜ Hocalar'da Değerlendirmelere Bak"
                                                >
                                                  <MessageCircle size={12} strokeWidth={2.5} />
                                                </a>
                                              </div>
                                            </div>'''

if target in content:
    content = content.replace(target, replacement)
    print("Replaced in grid view")
else:
    print("Target not found for grid view")

with open('frontend/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
