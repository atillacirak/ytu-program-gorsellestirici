import os
import requests

UPSTASH_REDIS_REST_URL = os.environ.get('UPSTASH_REDIS_REST_URL')
UPSTASH_REDIS_REST_TOKEN = os.environ.get('UPSTASH_REDIS_REST_TOKEN')

FALLBACK_GENERATED = int(os.environ.get('STATS_BASE_GENERATED', '643'))
FALLBACK_VISITS = int(os.environ.get('STATS_BASE_VISITS', '3000'))

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
        return {'total_generated': FALLBACK_GENERATED, 'total_visits': FALLBACK_VISITS}
    
    try:
        res = requests.get(f"{UPSTASH_REDIS_REST_URL}/mget/total_generated/total_visits", headers=get_headers(), timeout=5)
        data = res.json()
        if data.get('result'):
            # If the keys exist they return strings, else None
            gen = int(data['result'][0] or FALLBACK_GENERATED)
            vis = int(data['result'][1] or FALLBACK_VISITS)
            return {'total_generated': gen, 'total_visits': vis}
    except Exception as e:
        print(f"Redis get error: {e}")

    return {'total_generated': FALLBACK_GENERATED, 'total_visits': FALLBACK_VISITS}
