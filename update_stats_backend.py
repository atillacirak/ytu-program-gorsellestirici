import re
import os

file_path = 'backend/stats_db.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the else block in get_stats to also fetch previous period and chart data
new_else_block = """        else:
            seconds_map = {
                '24h': 86400,
                '7d': 7 * 86400,
                '30d': 30 * 86400
            }
            window_sec = seconds_map.get(period, 86400)
            min_ts = now_ts - window_sec
            prev_min_ts = min_ts - window_sec

            pipeline_body = [
                ["ZCOUNT", "z:total_generated", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_gano_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_gano_scenarios", str(min_ts), "+inf"],
                
                ["ZCOUNT", "z:total_generated", str(prev_min_ts), str(min_ts)],
                ["ZCOUNT", "z:total_visits", str(prev_min_ts), str(min_ts)],
                ["ZCOUNT", "z:total_gano_visits", str(prev_min_ts), str(min_ts)],
                ["ZCOUNT", "z:total_gano_scenarios", str(prev_min_ts), str(min_ts)],
                
                ["ZRANGEBYSCORE", "z:total_visits", str(min_ts), "+inf"]
            ]
            res = requests.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
            data = res.json()
            if isinstance(data, list) and len(data) >= 9:
                gen = int(data[0].get('result', 0) or 0)
                vis = int(data[1].get('result', 0) or 0)
                gano_vis = int(data[2].get('result', 0) or 0)
                gano_scen = int(data[3].get('result', 0) or 0)
                
                prev_gen = int(data[4].get('result', 0) or 0)
                prev_vis = int(data[5].get('result', 0) or 0)
                prev_gano_vis = int(data[6].get('result', 0) or 0)
                prev_gano_scen = int(data[7].get('result', 0) or 0)
                
                chart_elements = data[8].get('result', [])
                
                from collections import defaultdict
                from datetime import datetime
                
                chart_dict = defaultdict(int)
                for item in chart_elements:
                    # item format: "17231231:nonce"
                    try:
                        ts = int(item.split(':')[0])
                        dt = datetime.fromtimestamp(ts)
                        if period == '24h':
                            label = dt.strftime('%H:00')
                        else:
                            label = dt.strftime('%m-%d')
                        chart_dict[label] += 1
                    except Exception:
                        pass
                
                chart_data = [{'label': k, 'visits': v} for k, v in sorted(chart_dict.items(), key=lambda x: x[0])]
                
                def calc_pct(current, previous):
                    if previous == 0:
                        return 100 if current > 0 else 0
                    return round(((current - previous) / previous) * 100, 1)

                return {
                    'period': period,
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen,
                    'prev_total_generated': prev_gen,
                    'prev_total_visits': prev_vis,
                    'prev_total_gano_visits': prev_gano_vis,
                    'prev_total_gano_scenarios': prev_gano_scen,
                    'pct_generated': calc_pct(gen, prev_gen),
                    'pct_visits': calc_pct(vis, prev_vis),
                    'pct_gano_visits': calc_pct(gano_vis, prev_gano_vis),
                    'pct_gano_scenarios': calc_pct(gano_scen, prev_gano_scen),
                    'chart_data': chart_data
                }"""

# find the else block
pattern = re.compile(r'        else:\n            seconds_map = \{[\s\S]*?total_gano_scenarios\': gano_scen\n                \}', re.MULTILINE)
content = pattern.sub(new_else_block, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("updated stats_db.py")
