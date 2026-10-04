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

            pipeline_body = [
                ["ZCOUNT", "z:total_generated", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_gano_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_gano_scenarios", str(min_ts), "+inf"]
            ]
            res = requests.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
            data = res.json()
            if isinstance(data, list) and len(data) >= 4:
                gen = int(data[0].get('result', 0) or 0)
                vis = int(data[1].get('result', 0) or 0)
                gano_vis = int(data[2].get('result', 0) or 0)
                gano_scen = int(data[3].get('result', 0) or 0)
                return {
                    'period': period,
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen
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
