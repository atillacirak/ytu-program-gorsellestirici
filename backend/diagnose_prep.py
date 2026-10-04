import json
with open('frontend/src/data/prepSchedules.json', encoding='utf-8') as f:
    data = json.load(f)

keys = sorted(data.keys())
print('Toplam sinif:', len(keys))

for prefix in ['P1', 'P2', 'P3', 'P4']:
    group = [k for k in keys if k.startswith(prefix + '-')]
    nums = sorted([int(k.split('-')[1].split('/')[0]) for k in group])
    expected = list(range(min(nums), max(nums)+1)) if nums else []
    missing = [n for n in expected if n not in nums]
    status = 'EKSIK: ' + str(missing) if missing else 'tam'
    print(f'{prefix}: {len(nums)} sinif, {status}')

# P3-8 ve P4-16 kontrolu
print()
for k in sorted(data.keys()):
    if 'P3-8' in k or 'P4-16' in k or 'P3-08' in k:
        sched = data[k]['schedule']
        total_slots = sum(len(v) for v in sched.values())
        print(f'{k}: {total_slots} ders slotu')
