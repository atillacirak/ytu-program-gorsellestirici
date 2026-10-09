import re

file_path = 'frontend/src/app/stats/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Total Visits
content = re.sub(r'(<Users size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_visits)}', content)
# 2. Total Generated
content = re.sub(r'(<CheckCircle2 size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_generated)}', content)
# 3. Gano Visits
content = re.sub(r'(<Calculator size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_gano_visits)}', content)
# 4. Gano Scenarios
content = re.sub(r'(<TrendingUp size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_gano_scenarios)}', content)

# But wait, gano_scenarios might have already been inserted! Let's clean up first to be safe.
# Remove existing renderPct lines to avoid duplicates
content = re.sub(r'\s*\{period !== \'all\' && renderPct\(stats\?\.pct_.*?\)\}\n?', '\n', content)

content = re.sub(r'(<Users size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_visits)}', content)
content = re.sub(r'(<CheckCircle2 size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_generated)}', content)
content = re.sub(r'(<FileText size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_gano_visits)}', content)
content = re.sub(r'(<TrendingUp size=\{12\}.*?\n\s*<span>.*?</div\>)', r'\1\n            {period !== \'all\' && renderPct(stats?.pct_gano_scenarios)}', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("updated page.tsx with regex replacement")
