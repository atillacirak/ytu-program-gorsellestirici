import re

file_path = 'frontend/src/app/stats/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'(<Eye size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_visits)}', content)
content = re.sub(r'(<CheckCircle2 size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_generated)}', content)
content = re.sub(r'(<Calculator size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_gano_visits)}', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("updated page.tsx with regex replacement")
