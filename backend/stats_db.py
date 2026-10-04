import os
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

def get_headers():
    return {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}

def increment_stat(field='total_generated'):
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN
    if not url or not token:
        print(f"Stats increment failed: No Upstash URL or Token configured.")
        return
    try:
        res = requests.get(f"{url}/incr/{field}", headers={"Authorization": f"Bearer {token}"}, timeout=5)
        print(f"Stats incr [{field}]:", res.json())
    except Exception as e:
        print(f"Redis incr error [{field}]: {e}")

def get_stats():
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN

    if not url or not token:
        return {
            'total_generated': FALLBACK_GENERATED,
            'total_visits': FALLBACK_VISITS,
            'total_gano_visits': FALLBACK_GANO_VISITS,
            'total_gano_scenarios': FALLBACK_GANO_SCENARIOS
        }
    
    try:
        res = requests.get(
            f"{url}/mget/total_generated/total_visits/total_gano_visits/total_gano_scenarios",
            headers={"Authorization": f"Bearer {token}"},
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
                'total_generated': gen,
                'total_visits': vis,
                'total_gano_visits': gano_vis,
                'total_gano_scenarios': gano_scen
            }
    except Exception as e:
        print(f"Redis get error: {e}")

    return {
        'total_generated': FALLBACK_GENERATED,
        'total_visits': FALLBACK_VISITS,
        'total_gano_visits': FALLBACK_GANO_VISITS,
        'total_gano_scenarios': FALLBACK_GANO_SCENARIOS
    }
