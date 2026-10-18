import os
import time
import uuid
import atexit
import threading
from collections import defaultdict
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
FALLBACK_GENERATED_PDF = int(os.environ.get('STATS_BASE_GENERATED_PDF', '783'))
FALLBACK_GENERATED_PREP = int(os.environ.get('STATS_BASE_GENERATED_PREP', '131'))
FALLBACK_DEVAMSIZLIK_VISITS = int(os.environ.get('STATS_BASE_DEVAMSIZLIK_VISITS', '0'))
FALLBACK_PLANLAMA_VISITS = int(os.environ.get('STATS_BASE_PLANLAMA_VISITS', '0'))

# Persistent HTTP session for TLS Keep-Alive reuse
_SESSION = requests.Session()

# Write-behind buffer to protect Upstash Redis command quota and eliminate user-facing latency
_BUFFER_LOCK = threading.Lock()
_INCR_BUFFER: dict[str, int] = defaultdict(int)
_ZADD_BUFFER: dict[str, list[tuple[int, str]]] = defaultdict(list)

# In-memory read cache for /api/stats queries
_READ_CACHE_LOCK = threading.Lock()
_READ_CACHE: dict[str, tuple[float, dict]] = {}
READ_CACHE_TTL = 45.0  # seconds
FLUSH_INTERVAL = 25.0  # seconds


def _flush_buffer_to_redis() -> None:
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN
    if not url or not token:
        return

    with _BUFFER_LOCK:
        if not _INCR_BUFFER and not _ZADD_BUFFER:
            return
        incr_snap = dict(_INCR_BUFFER)
        zadd_snap = {k: list(v) for k, v in _ZADD_BUFFER.items()}
        _INCR_BUFFER.clear()
        _ZADD_BUFFER.clear()

    headers = {"Authorization": f"Bearer {token}"}
    now_ts = int(time.time())
    cutoff_ts = str(now_ts - 60 * 86400)
    pipeline_body = []

    for field, delta in incr_snap.items():
        if delta > 0:
            pipeline_body.append(["INCRBY", field, str(delta)])

    for zkey, entries in zadd_snap.items():
        if entries:
            zadd_cmd = ["ZADD", zkey]
            for ts, member in entries:
                zadd_cmd.extend([str(ts), member])
            pipeline_body.append(zadd_cmd)
            pipeline_body.append(["ZREMRANGEBYSCORE", zkey, "-inf", cutoff_ts])

    if not pipeline_body:
        return

    try:
        _SESSION.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
    except Exception as e:
        print(f"Redis batch flush error: {e}")
        # Restore buffered counts on transient network failure so metrics are not lost
        with _BUFFER_LOCK:
            for field, delta in incr_snap.items():
                _INCR_BUFFER[field] += delta
            for zkey, entries in zadd_snap.items():
                _ZADD_BUFFER[zkey].extend(entries)


def _start_background_flusher() -> None:
    def _worker():
        while True:
            time.sleep(FLUSH_INTERVAL)
            _flush_buffer_to_redis()

    t = threading.Thread(target=_worker, name="upstash-stats-flusher", daemon=True)
    t.start()


_start_background_flusher()
atexit.register(_flush_buffer_to_redis)


def increment_stat(field='total_generated'):
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN
    if not url or not token:
        return

    now_ts = int(time.time())
    nonce = uuid.uuid4().hex[:6]
    zkey = f"z:{field}"

    with _BUFFER_LOCK:
        _INCR_BUFFER[field] += 1
        _ZADD_BUFFER[zkey].append((now_ts, f"{now_ts}:{nonce}"))
        total_buffered = sum(_INCR_BUFFER.values())

    # If high traffic accumulates >= 50 events before the timer ticks, flush asynchronously
    if total_buffered >= 50:
        threading.Thread(target=_flush_buffer_to_redis, daemon=True).start()


def get_stats(period='all'):
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or UPSTASH_REDIS_REST_URL
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or UPSTASH_REDIS_REST_TOKEN

    with _BUFFER_LOCK:
        pending_incr = dict(_INCR_BUFFER)

    if not url or not token:
        return {
            'period': period,
            'total_generated': FALLBACK_GENERATED + pending_incr.get('total_generated', 0),
            'total_visits': FALLBACK_VISITS + pending_incr.get('total_visits', 0),
            'total_gano_visits': FALLBACK_GANO_VISITS + pending_incr.get('total_gano_visits', 0),
            'total_gano_scenarios': FALLBACK_GANO_SCENARIOS + pending_incr.get('total_gano_scenarios', 0),
            'total_generated_pdf': FALLBACK_GENERATED_PDF + pending_incr.get('total_generated_pdf', 0),
            'total_generated_prep': FALLBACK_GENERATED_PREP + pending_incr.get('total_generated_prep', 0),
            'total_devamsizlik_visits': FALLBACK_DEVAMSIZLIK_VISITS + pending_incr.get('total_devamsizlik_visits', 0),
            'total_planlama_visits': FALLBACK_PLANLAMA_VISITS + pending_incr.get('total_planlama_visits', 0)
        }

    now_mono = time.monotonic()
    with _READ_CACHE_LOCK:
        cached = _READ_CACHE.get(period)
        if cached and (now_mono - cached[0]) < READ_CACHE_TTL:
            base = dict(cached[1])
            for k in (
                'total_generated', 'total_visits', 'total_gano_visits', 'total_gano_scenarios',
                'total_generated_pdf', 'total_generated_prep', 'total_devamsizlik_visits', 'total_planlama_visits'
            ):
                if k in base and k in pending_incr:
                    base[k] += pending_incr[k]
            return base

    # Flush pending writes before fetching fresh stats so Redis reflects latest state
    _flush_buffer_to_redis()

    headers = {"Authorization": f"Bearer {token}"}
    now_ts = int(time.time())

    try:
        if period == 'all':
            res = _SESSION.get(
                f"{url}/mget/total_generated/total_visits/total_gano_visits/total_gano_scenarios/total_generated_pdf/total_generated_prep/total_devamsizlik_visits/total_planlama_visits",
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
                dev_vis = int(result[6]) if (len(result) > 6 and result[6] is not None) else FALLBACK_DEVAMSIZLIK_VISITS
                plan_vis = int(result[7]) if (len(result) > 7 and result[7] is not None) else FALLBACK_PLANLAMA_VISITS
                out = {
                    'period': 'all',
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen,
                    'total_generated_pdf': gen_pdf,
                    'total_generated_prep': gen_prep,
                    'total_devamsizlik_visits': dev_vis,
                    'total_planlama_visits': plan_vis
                }
                with _READ_CACHE_LOCK:
                    _READ_CACHE[period] = (time.monotonic(), out)
                return out
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

                ["ZCOUNT", "z:total_devamsizlik_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_devamsizlik_visits", str(prev_min_ts), str(min_ts)],

                ["ZRANGEBYSCORE", "z:total_visits", str(min_ts), "+inf"],

                ["ZCOUNT", "z:total_planlama_visits", str(min_ts), "+inf"],
                ["ZCOUNT", "z:total_planlama_visits", str(prev_min_ts), str(min_ts)]
            ]
            res = _SESSION.post(f"{url}/pipeline", json=pipeline_body, headers=headers, timeout=5)
            data = res.json()
            if isinstance(data, list) and len(data) >= 15:
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

                dev_vis = int(data[10].get('result', 0) or 0)
                prev_dev_vis = int(data[11].get('result', 0) or 0)

                chart_elements = data[12].get('result', [])

                plan_vis = int(data[13].get('result', 0) or 0)
                prev_plan_vis = int(data[14].get('result', 0) or 0)
                
                from datetime import datetime, timezone, timedelta
                
                # Türkiye Saati (UTC+3)
                tz_tr = timezone(timedelta(hours=3))
                now_dt = datetime.fromtimestamp(now_ts, tz=tz_tr)

                if period == '24h':
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

                else:  # 30d
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

                out = {
                    'period': period,
                    'total_generated': gen,
                    'total_visits': vis,
                    'total_gano_visits': gano_vis,
                    'total_gano_scenarios': gano_scen,
                    'total_generated_pdf': gen_pdf,
                    'total_generated_prep': gen_prep,
                    'total_devamsizlik_visits': dev_vis,
                    'total_planlama_visits': plan_vis,
                    'prev_total_generated': prev_gen,
                    'prev_total_visits': prev_vis,
                    'prev_total_gano_visits': prev_gano_vis,
                    'prev_total_gano_scenarios': prev_gano_scen,
                    'prev_total_devamsizlik_visits': prev_dev_vis,
                    'prev_total_planlama_visits': prev_plan_vis,
                    'pct_generated': calc_pct(gen, prev_gen),
                    'pct_visits': calc_pct(vis, prev_vis),
                    'pct_gano_visits': calc_pct(gano_vis, prev_gano_vis),
                    'pct_gano_scenarios': calc_pct(gano_scen, prev_gano_scen),
                    'pct_devamsizlik_visits': calc_pct(dev_vis, prev_dev_vis),
                    'pct_planlama_visits': calc_pct(plan_vis, prev_plan_vis),
                    'chart_data': chart_data
                }
                with _READ_CACHE_LOCK:
                    _READ_CACHE[period] = (time.monotonic(), out)
                return out
    except Exception as e:
        print(f"Redis get_stats error [{period}]: {e}")

    return {
        'period': period,
        'total_generated': FALLBACK_GENERATED,
        'total_visits': FALLBACK_VISITS,
        'total_gano_visits': FALLBACK_GANO_VISITS,
        'total_gano_scenarios': FALLBACK_GANO_SCENARIOS,
        'total_generated_pdf': FALLBACK_GENERATED_PDF,
        'total_generated_prep': FALLBACK_GENERATED_PREP,
        'total_devamsizlik_visits': FALLBACK_DEVAMSIZLIK_VISITS,
        'total_planlama_visits': FALLBACK_PLANLAMA_VISITS
    }

