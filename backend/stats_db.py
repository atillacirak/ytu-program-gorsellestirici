import os
import requests

UPSTASH_REDIS_REST_URL = os.environ.get('UPSTASH_REDIS_REST_URL')
UPSTASH_REDIS_REST_TOKEN = os.environ.get('UPSTASH_REDIS_REST_TOKEN')

FALLBACK_GENERATED = int(os.environ.get('STATS_BASE_GENERATED', '643'))
FALLBACK_VISITS = int(os.environ.get('STATS_BASE_VISITS', '3000'))
FALLBACK_GANO_VISITS = int(os.environ.get('STATS_BASE_GANO_VISITS', '450'))
FALLBACK_GANO_SCENARIOS = int(os.environ.get('STATS_BASE_GANO_SCENARIOS', '180'))

def get_headers():
    return {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}

def increment_stat(field='total_generated'):
    if not UPSTASH_REDIS_REST_URL or not UPSTASH_REDIS_REST_TOKEN:
        return
    try:
        requests.get(f"{UPSTASH_REDIS_REST_URL}/incr/{field}", headers=get_headers(), timeout=5)
    except Exception as e:
        print(f"Redis incr error: {e}")

def get_stats():
    if not UPSTASH_REDIS_REST_URL or not UPSTASH_REDIS_REST_TOKEN:
        return {
            'total_generated': FALLBACK_GENERATED,
            'total_visits': FALLBACK_VISITS,
            'total_gano_visits': FALLBACK_GANO_VISITS,
            'total_gano_scenarios': FALLBACK_GANO_SCENARIOS
        }
    
    try:
        res = requests.get(
            f"{UPSTASH_REDIS_REST_URL}/mget/total_generated/total_visits/total_gano_visits/total_gano_scenarios",
            headers=get_headers(),
            timeout=5
        )
        data = res.json()
        if data.get('result'):
            result = data['result']
            gen = int(result[0] or FALLBACK_GENERATED)
            vis = int(result[1] or FALLBACK_VISITS)
            gano_vis = int(result[2] or FALLBACK_GANO_VISITS)
            gano_scen = int(result[3] or FALLBACK_GANO_SCENARIOS)
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
