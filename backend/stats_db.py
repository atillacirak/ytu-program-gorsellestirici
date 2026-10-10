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
FALLBACK_GENERATED_PDF = int(os.environ.get('STATS_BASE_GENERATED_PDF', '0'))
FALLBACK_GENERATED_PREP = int(os.environ.get('STATS_BASE_GENERATED_PREP', '0'))

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
            'total_gano_scenarios': FALLBACK_GANO_SCENARIOS,
            'total_generated_pdf': FALLBACK_GENERATED_PDF,
            'total_generated_prep': FALLBACK_GENERATED_PREP
        }
    
    headers = {"Authorization": f"Bearer {token}"}
    now_ts = int(time.time())

    try:
        if period == 'all':
            res = requests.get(
                f"{url}/mget/total_generated/total_visits/total_gano_visits/total_gano_scenarios/total_generated_pdf/total_generated_prep",
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
                gen_pdf = int(result[4]) if (len(result) > 4 and result[4] is not None) else FALLBACK_GENERATED_PDF
                gen_prep = int(result[5]) if (len(result) > 5 and result[5] is not None) else FALLBACK_GENERATED_PREP
                return {
                    'period': 'all',
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen,
                    'total_generated_pdf': gen_pdf,
                    'total_generated_prep': gen_prep
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
                
                ["ZCOUNT", "z:total_generated_pdf", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_generated_prep", str(min_ts), "+inf"],

                ["ZRANGEBYSCORE", "z:total_visits", str(min_ts), "+inf"]
            ]
            res = requests.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
            data = res.json()
            if isinstance(data, list) and len(data) >= 11:
                gen = int(data[0].get('result', 0) or 0)
                vis = int(data[1].get('result', 0) or 0)
                gano_vis = int(data[2].get('result', 0) or 0)
                gano_scen = int(data[3].get('result', 0) or 0)
                
                prev_gen = int(data[4].get('result', 0) or 0)
                prev_vis = int(data[5].get('result', 0) or 0)
                prev_gano_vis = int(data[6].get('result', 0) or 0)
                prev_gano_scen = int(data[7].get('result', 0) or 0)
                
                gen_pdf = int(data[8].get('result', 0) or 0)
                gen_prep = int(data[9].get('result', 0) or 0)

                chart_elements = data[10].get('result', [])
                
                from datetime import datetime, timezone, timedelta
                
                # Türkiye Saati (UTC+3)
                tz_tr = timezone(timedelta(hours=3))
                now_dt = datetime.fromtimestamp(now_ts, tz=tz_tr)

                if period == '24h':
                    # Kayan 24 Saat (Rolling 24 Hours): Şu anki saatten 23 saat öncesinden başlayıp şu anki saate kadar
                    # Gün geçişlerinde aynı saatlerin birbirini ezmemesi için key olarak %Y-%m-%d-%H kullanılır
                    dt_list = [(now_dt - timedelta(hours=i)) for i in range(23, -1, -1)]
                    chart_dict = {dt.strftime('%Y-%m-%d-%H'): 0 for dt in dt_list}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            key = dt.strftime('%Y-%m-%d-%H')
                            if key in chart_dict:
                                chart_dict[key] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': dt.strftime('%H:00'), 'visits': chart_dict[dt.strftime('%Y-%m-%d-%H')]} for dt in dt_list]

                elif period == '7d':
                    # Son 7 günün tamamını eksiksiz doldur
                    dt_list = [(now_dt - timedelta(days=i)) for i in range(6, -1, -1)]
                    chart_dict = {dt.strftime('%Y-%m-%d'): 0 for dt in dt_list}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            key = dt.strftime('%Y-%m-%d')
                            if key in chart_dict:
                                chart_dict[key] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': dt.strftime('%m-%d'), 'visits': chart_dict[dt.strftime('%Y-%m-%d')]} for dt in dt_list]

                else: # 30d
                    dt_list = [(now_dt - timedelta(days=i)) for i in range(29, -1, -1)]
                    chart_dict = {dt.strftime('%Y-%m-%d'): 0 for dt in dt_list}
                    for item in chart_elements:
                        try:
                            ts = int(item.split(':')[0])
                            dt = datetime.fromtimestamp(ts, tz=tz_tr)
                            key = dt.strftime('%Y-%m-%d')
                            if key in chart_dict:
                                chart_dict[key] += 1
                        except Exception:
                            pass
                    chart_data = [{'label': dt.strftime('%m-%d'), 'visits': chart_dict[dt.strftime('%Y-%m-%d')]} for dt in dt_list]
                
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
                    'total_generated_pdf': gen_pdf,
                    'total_generated_prep': gen_prep,
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
        'total_gano_scenarios': FALLBACK_GANO_SCENARIOS,
        'total_generated_pdf': FALLBACK_GENERATED_PDF,
        'total_generated_prep': FALLBACK_GENERATED_PREP
    }
