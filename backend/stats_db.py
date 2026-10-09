import os
import time
import uuid
import requests
from dotenv import load_dotenv

# Explicitly load .env file from the backend directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

UPSTASH_REDIS_REST_URL = os.environ.get('UPSTASH_REDIS_REST_URL')
UPSTASH_REDIS_REST_TOKEN = os.environ.get('UPSTASH_REDIS_REST_TOKEN')

FALLBACK_GENERATED = int(os.environ.get('STATS_BASE_GENERATED', '0'))
FALLBACK_VISITS = int(os.environ.get('STATS_BASE_VISITS', '0'))
FALLBACK_GANO_VISITS = int(os.environ.get('STATS_BASE_GANO_VISITS', '0'))
FALLBACK_GANO_SCENARIOS = int(os.environ.get('STATS_BASE_GANO_SCENARIOS', '0'))

def increment_stat(field='total_generated'):
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN
    if not url or not token:
        print("Stats increment failed: No Upstash URL or Token configured.")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    now_ts = int(time.time())
    nonce = uuid.uuid4().hex[:6]
    zkey = f"z:{field}"

    try:
        # Pipeline: INCR global counter + ZADD timestamped event + ZREMRANGEBYSCORE old events (> 60 days)
        pipeline_body = [
            ["INCR", field],
            ["ZADD", zkey, str(now_ts), f"{now_ts}:{nonce}"],
            ["ZREMRANGEBYSCORE", zkey, "-inf", str(now_ts - 60 * 86400)]
        ]
        res = requests.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
        print(f"Stats incr [{field}]:", res.json())
    except Exception as e:
        print(f"Redis incr error [{field}]: {e}")

def get_stats(period='all'):
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN

    if not url or not token:
        return {
            'period': period,
            'total_generated': FALLBACK_GENERATED,
            'total_visits': FALLBACK_VISITS,
            'total_gano_visits': FALLBACK_GANO_VISITS,
            'total_gano_scenarios': FALLBACK_GANO_SCENARIOS
        }
    
    headers = {"Authorization": f"Bearer {token}"}
    now_ts = int(time.time())

    try:
        if period == 'all':
            res = requests.get(
                f"{url}/mget/total_generated/total_visits/total_gano_visits/total_gano_scenarios",
                headers=headers,
                timeout=5
            )
            data = res.json()
            if data.get('result'):
                result = data['result']
                gen = int(result[0]) if (result[0] is not None) else FALLBACK_GENERATED
                vis = int(result[1]) if (result[1] is not None) else FALLBACK_VISITS
                gano_vis = int(result[2]) if (result[2] is not None) else FALLBACK_GANO_VISITS
                gano_scen = int(result[3]) if (result[3] is not None) else FALLBACK_GANO_SCENARIOS
                return {
                    'period': 'all',
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen
                }
        else:
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
                from datetime import datetime, timezone, timedelta
                
                # Türkiye Saati (UTC+3)
                tz_tr = timezone(timedelta(hours=3))
                now_dt = datetime.fromtimestamp(now_ts, tz=tz_tr)

                if period == '24h':
                    # Son 24 saatin her saat dilimini sırayla oluştur (örn: 24 saat öncesinden şu ana kadar veya 00:00 - 23:00)
                    # Kullanıcı 00:00'dan 23:00'e kadar tüm 24 saati görmek istiyor
                    chart_dict = {f"{h:02d}:00": 0 for h in range(24)}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            label = dt.strftime('%H:00')
                            if label in chart_dict:
                                chart_dict[label] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': k, 'visits': chart_dict[k]} for k in sorted(chart_dict.keys())]

                elif period == '7d':
                    # Son 7 günün tamamını eksiksiz doldur
                    days_list = [(now_dt - timedelta(days=i)).strftime('%m-%d') for i in range(6, -1, -1)]
                    chart_dict = {d: 0 for d in days_list}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            label = dt.strftime('%m-%d')
                            if label in chart_dict:
                                chart_dict[label] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': d, 'visits': chart_dict[d]} for d in days_list]

                else: # 30d
                    days_list = [(now_dt - timedelta(days=i)).strftime('%m-%d') for i in range(29, -1, -1)]
                    chart_dict = {d: 0 for d in days_list}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            label = dt.strftime('%m-%d')
                            if label in chart_dict:
                                chart_dict[label] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': d, 'visits': chart_dict[d]} for d in days_list]
                
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
                }
    except Exception as e:
        print(f"Redis get_stats error [{period}]: {e}")

    return {
        'period': period,
        'total_generated': FALLBACK_GENERATED,
        'total_visits': FALLBACK_VISITS,
        'total_gano_visits': FALLBACK_GANO_VISITS,
        'total_gano_scenarios': FALLBACK_GANO_SCENARIOS
    }
