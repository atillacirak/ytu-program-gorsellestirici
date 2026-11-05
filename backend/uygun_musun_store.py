# -*- coding: utf-8 -*-
"""
Uygun Musun? - Çoklu Profil Ders Programı ve Anlık Durum Eşitleme Deposu.
SQLite WAL tabanlı hafif, thread-safe kalıcılık katmanı.
KVKK gereği öğrenci numarası veya kimlik verisi saklamaz; yalnızca profil takma adı,
haftalık ders saatleri ve geçici durum notlarını tutar.
"""

import os
import json
import time
import re
import sqlite3
import threading
from typing import Dict, Any, Optional

STORE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uygun_musun.db')
VAPID_PUBLIC_KEY = "BDnRuh7ebajipe5pRdbsIMAKqf5iEUmThXPOXuYlcXX_5-G0pbOTm4-7axfxz5dJvloVZyNnUHlef0BmU79jMnM"
VAPID_PRIVATE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vapid_private_key.pem')
VAPID_CLAIMS = {"sub": "mailto:admin@ytudostun.com"}

try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None
    WebPushException = Exception

_DB_LOCK = threading.Lock()


def _sanitize_room_code(code: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9_-]', '', (code or '').strip().lower())
    return cleaned[:32] or 'atilla-neva'


def _init_db() -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        try:
            conn.execute('PRAGMA journal_mode = WAL;')
            conn.execute('PRAGMA synchronous = NORMAL;')
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS rooms (
                    room_code TEXT PRIMARY KEY,
                    data_json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
                '''
            )
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_code TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                )
                '''
            )
            conn.execute(
                '''
                CREATE INDEX IF NOT EXISTS idx_push_subs ON push_subscriptions (room_code, profile_id)
                '''
            )
            conn.commit()
        finally:
            conn.close()


_init_db()


ATILLA_SCHEDULE = {
    'term': '2026-2027 Güz',
    'title': 'Atilla Ders Programı',
    'schedule': {
        'Pazartesi': [
            {
                'code': 'BLM2642',
                'name': 'Bilgisayar Mühendisleri için Diferansiyel Denklemler',
                'section': '2',
                'classroom': 'EEF-D-B11',
                'instructor': 'MKY',
                'start_time': '13:00',
                'end_time': '15:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'BLM1991',
                'name': 'İş Sağlığı ve Güvenliği 1',
                'section': '1',
                'classroom': 'Online',
                'instructor': 'ST',
                'start_time': '16:00',
                'end_time': '17:50',
                'is_lab': False,
                'is_online': true if 'true' == 'false' else True,
            },
        ],
        'Salı': [
            {
                'code': 'BLM2611',
                'name': 'Lojik Devreler',
                'section': '2',
                'classroom': 'EEF-D-012',
                'instructor': 'HOI',
                'start_time': '13:00',
                'end_time': '15:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'BLM2611',
                'name': 'Lojik Devreler Lab',
                'section': '2',
                'classroom': 'LAB (BLM LAB)',
                'instructor': 'HOI',
                'start_time': '16:00',
                'end_time': '17:50',
                'is_lab': True,
                'is_online': False,
            },
        ],
        'Çarşamba': [
            {
                'code': 'BLM2012',
                'name': 'Nesneye Yönelik Programlama',
                'section': '2',
                'classroom': 'EEF-D-B11',
                'instructor': 'FC',
                'start_time': '09:00',
                'end_time': '11:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'BLM2012',
                'name': 'Nesneye Yönelik Programlama Lab',
                'section': '2',
                'classroom': 'LAB (BLM LAB)',
                'instructor': 'FC',
                'start_time': '15:00',
                'end_time': '16:50',
                'is_lab': True,
                'is_online': False,
            },
        ],
        'Perşembe': [
            {
                'code': 'BLM1011',
                'name': 'Bilgisayar Bilimlerine Giriş',
                'section': '1',
                'classroom': 'EEF-D-108',
                'instructor': 'MAG',
                'start_time': '09:00',
                'end_time': '11:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'BLM1011',
                'name': 'Bilgisayar Bilimlerine Giriş Lab',
                'section': '1',
                'classroom': 'LAB (BLM LAB)',
                'instructor': 'MAG',
                'start_time': '13:00',
                'end_time': '14:50',
                'is_lab': True,
                'is_online': False,
            },
        ],
        'Cuma': [
            {
                'code': 'BLM3042',
                'name': 'Seminer ve Meslek Etiği',
                'section': '1',
                'classroom': 'EEF-D-110',
                'instructor': 'HTK',
                'start_time': '14:00',
                'end_time': '16:50',
                'is_lab': False,
                'is_online': False,
            },
        ],
    },
}

NEVA_SCHEDULE = {
    'term': '2026-2027 Güz',
    'title': 'Neva Ders Programı',
    'schedule': {
        'Pazartesi': [
            {
                'code': 'SYP1061',
                'name': 'Dijital Ortamda Tasarım Yöntemleri',
                'section': '1',
                'classroom': 'C2008 (SANAT)',
                'instructor': '',
                'start_time': '13:00',
                'end_time': '16:50',
                'is_lab': False,
                'is_online': False,
            },
        ],
        'Salı': [
            {
                'code': 'SYP1041',
                'name': 'Sanat Tarihine Giriş',
                'section': '1',
                'classroom': 'STF B2032',
                'instructor': '',
                'start_time': '13:00',
                'end_time': '14:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'TDB1031',
                'name': 'Türkçe 1',
                'section': '33',
                'classroom': 'TDB2[ONLINE]',
                'instructor': '',
                'start_time': '15:00',
                'end_time': '16:50',
                'is_lab': False,
                'is_online': True,
            },
        ],
        'Çarşamba': [
            {
                'code': 'SYP1092',
                'name': 'Bilgi Yönetimi',
                'section': '1',
                'classroom': 'STF B1025',
                'instructor': '',
                'start_time': '10:00',
                'end_time': '11:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'SYP2111',
                'name': 'İşletmeye Giriş',
                'section': '1',
                'classroom': 'STF B2032',
                'instructor': '',
                'start_time': '12:00',
                'end_time': '13:50',
                'is_lab': False,
                'is_online': False,
            },
            {
                'code': 'SYP1071',
                'name': 'Sanat Yönetimi 1',
                'section': '1',
                'classroom': 'STF B2033',
                'instructor': '',
                'start_time': '14:00',
                'end_time': '16:50',
                'is_lab': False,
                'is_online': False,
            },
        ],
        'Perşembe': [
            {
                'code': 'BSP1101',
                'name': 'Temel Tasarım 1',
                'section': '6',
                'classroom': 'STF B2033',
                'instructor': '',
                'start_time': '09:00',
                'end_time': '15:50',
                'is_lab': False,
                'is_online': False,
            },
        ],
        'Cuma': [],
    },
}


def _default_room_state(room_code: str) -> Dict[str, Any]:
    now_ms = int(time.time() * 1000)
    return {
        'room_code': room_code,
        'updated_at': now_ms,
        'pings': [],
        'profiles': [
            {
                'id': 'atilla',
                'name': 'Atilla',
                'color': 'blue',
                'avatar': '👨‍💻',
                'schedule': ATILLA_SCHEDULE,
                'custom_status': None,
            },
            {
                'id': 'neva',
                'name': 'Neva',
                'color': 'violet',
                'avatar': '👩‍🎓',
                'schedule': NEVA_SCHEDULE,
                'custom_status': None,
            },
        ],
    }


def _clean_expired_statuses(room: Dict[str, Any]) -> Dict[str, Any]:
    now_ms = int(time.time() * 1000)
    for profile in room.get('profiles', []):
        cs = profile.get('custom_status')
        if cs and isinstance(cs, dict):
            expires_at = cs.get('expires_at')
            if expires_at and isinstance(expires_at, (int, float)) and now_ms > expires_at:
                profile['custom_status'] = None
    
    # Clean pings older than 4 hours
    pings = room.get('pings', [])
    valid_pings = []
    four_hours_ago = now_ms - (4 * 3600 * 1000)
    for p in pings:
        if isinstance(p, dict) and p.get('created_at', 0) > four_hours_ago:
            valid_pings.append(p)
    room['pings'] = valid_pings[-10:]
    return room


def get_room(room_code: str) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        try:
            cur = conn.cursor()
            cur.execute('SELECT data_json FROM rooms WHERE room_code = ?', (code,))
            row = cur.fetchone()
            if not row:
                default_state = _default_room_state(code)
                conn.execute(
                    'INSERT INTO rooms (room_code, data_json, updated_at) VALUES (?, ?, ?)',
                    (code, json.dumps(default_state, ensure_ascii=False), default_state['updated_at']),
                )
                conn.commit()
                return default_state
            room = json.loads(row[0])
            return _clean_expired_statuses(room)
        finally:
            conn.close()


def save_room(room_code: str, room_data: Dict[str, Any]) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    now_ms = int(time.time() * 1000)
    room_data['room_code'] = code
    room_data['updated_at'] = now_ms
    room_data = _clean_expired_statuses(room_data)

    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        try:
            conn.execute(
                '''
                INSERT INTO rooms (room_code, data_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(room_code) DO UPDATE SET
                    data_json = excluded.data_json,
                    updated_at = excluded.updated_at
                ''',
                (code, json.dumps(room_data, ensure_ascii=False), now_ms),
            )
            conn.commit()
        finally:
            conn.close()
    return room_data


def upsert_profile(room_code: str, profile_payload: Dict[str, Any]) -> Dict[str, Any]:
    room = get_room(room_code)
    profiles = room.get('profiles', [])
    pid = str(profile_payload.get('id') or '').strip()
    if not pid:
        pid = f"p_{int(time.time() * 1000)}"

    # KVKK: Öğrenci numarası veya TC gibi alanları kesin olarak temizle
    schedule_data = profile_payload.get('schedule')
    if isinstance(schedule_data, dict):
        schedule_data = dict(schedule_data)
        schedule_data.pop('student_id', None)
        schedule_data.pop('tc_no', None)

    existing_idx = next((i for i, p in enumerate(profiles) if p.get('id') == pid), -1)
    if existing_idx >= 0:
        cur = profiles[existing_idx]
        if 'name' in profile_payload and profile_payload['name']:
            cur['name'] = str(profile_payload['name'])[:25]
        if 'color' in profile_payload and profile_payload['color']:
            cur['color'] = str(profile_payload['color'])[:20]
        if 'avatar' in profile_payload and profile_payload['avatar']:
            cur['avatar'] = str(profile_payload['avatar'])[:8]
        if 'schedule' in profile_payload:
            cur['schedule'] = schedule_data
        if 'custom_status' in profile_payload:
            cur['custom_status'] = profile_payload['custom_status']
        profiles[existing_idx] = cur
    else:
        if len(profiles) >= 8:
            raise ValueError('Bir odada en fazla 8 profil bulunabilir.')
        profiles.append({
            'id': pid,
            'name': str(profile_payload.get('name') or 'Arkadaş')[:25],
            'color': str(profile_payload.get('color') or 'emerald')[:20],
            'avatar': str(profile_payload.get('avatar') or '🎓')[:8],
            'schedule': schedule_data,
            'custom_status': profile_payload.get('custom_status'),
        })

    room['profiles'] = profiles
    return save_room(room_code, room)


def update_profile_status(
    room_code: str,
    profile_id: str,
    custom_status: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    room = get_room(room_code)
    profiles = room.get('profiles', [])
    target = next((p for p in profiles if p.get('id') == profile_id), None)
    if not target:
        raise KeyError(f"Profil bulunamadı: {profile_id}")

    if custom_status is None:
        target['custom_status'] = None
    else:
        now_ms = int(time.time() * 1000)
        target['custom_status'] = {
            'type': str(custom_status.get('type') or 'custom')[:20],
            'preset_id': str(custom_status.get('preset_id') or '')[:30],
            'emoji': str(custom_status.get('emoji') or '💬')[:8],
            'label': str(custom_status.get('label') or '')[:60],
            'note': str(custom_status.get('note') or '')[:160],
            'early_exit': bool(custom_status.get('early_exit', False)),
            'early_exit_until': str(custom_status.get('early_exit_until') or '')[:10],
            'early_exit_day': str(custom_status.get('early_exit_day') or '')[:20],
            'created_at': custom_status.get('created_at') or now_ms,
            'expires_at': custom_status.get('expires_at'),
        }

    return save_room(room_code, room)


def delete_profile(room_code: str, profile_id: str) -> Dict[str, Any]:
    room = get_room(room_code)
    profiles = room.get('profiles', [])
    if len(profiles) <= 2:
        raise ValueError('En az 2 profil kalmalıdır.')
    room['profiles'] = [p for p in profiles if p.get('id') != profile_id]
    return save_room(room_code, room)


def send_ping(
    room_code: str,
    from_id: str,
    to_id: str,
    ping_type: str,
    message: str = '',
    emoji: str = '☕'
) -> Dict[str, Any]:
    room = get_room(room_code)
    pings = room.get('pings', [])
    now_ms = int(time.time() * 1000)
    ping_id = f"ping_{now_ms}_{from_id}"
    new_ping = {
        'id': ping_id,
        'from_id': from_id,
        'to_id': to_id,
        'type': ping_type,
        'message': message[:100],
        'emoji': emoji[:8],
        'created_at': now_ms,
        'dismissed': False,
    }
    pings.append(new_ping)
    room['pings'] = pings[-10:]
    return save_room(room_code, room)


def dismiss_ping(room_code: str, ping_id: str) -> Dict[str, Any]:
    room = get_room(room_code)
    pings = room.get('pings', [])
    for p in pings:
        if p.get('id') == ping_id:
            p['dismissed'] = True
    room['pings'] = pings
    return save_room(room_code, room)


# ---------------------------------------------------------------------------
# Web Push Bildirimleri (PWA Push API & Kilit Ekranı)
# ---------------------------------------------------------------------------

def save_push_subscription(room_code: str, profile_id: str, sub: Dict[str, Any]) -> Dict[str, Any]:
    clean_code = _sanitize_room_code(room_code)
    endpoint = str(sub.get('endpoint') or '').strip()
    keys = sub.get('keys') or {}
    p256dh = str(keys.get('p256dh') or '').strip()
    auth = str(keys.get('auth') or '').strip()

    if not endpoint or not p256dh or not auth:
        raise ValueError('Geçersiz push subscription verisi.')

    now_ms = int(time.time() * 1000)

    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        try:
            conn.execute(
                '''
                INSERT INTO push_subscriptions (room_code, profile_id, endpoint, p256dh, auth, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(endpoint) DO UPDATE SET
                    room_code = excluded.room_code,
                    profile_id = excluded.profile_id,
                    p256dh = excluded.p256dh,
                    auth = excluded.auth,
                    updated_at = excluded.updated_at
                ''',
                (clean_code, profile_id, endpoint, p256dh, auth, now_ms, now_ms),
            )
            conn.commit()
        finally:
            conn.close()

    return {'success': True, 'profile_id': profile_id}


def remove_push_subscription(endpoint: str) -> None:
    endpoint_clean = str(endpoint or '').strip()
    if not endpoint_clean:
        return
    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        try:
            conn.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', (endpoint_clean,))
            conn.commit()
        finally:
            conn.close()


def get_push_subscriptions(room_code: str, profile_id: str) -> list:
    clean_code = _sanitize_room_code(room_code)
    with _DB_LOCK:
        conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                '''
                SELECT endpoint, p256dh, auth FROM push_subscriptions
                WHERE room_code = ? AND profile_id = ?
                ''',
                (clean_code, profile_id),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


def _dispatch_push_worker(subs: list, payload_json: str):
    if not webpush or not os.path.exists(VAPID_PRIVATE_KEY_PATH):
        return

    for sub in subs:
        sub_info = {
            'endpoint': sub['endpoint'],
            'keys': {
                'p256dh': sub['p256dh'],
                'auth': sub['auth'],
            },
        }
        try:
            webpush(
                subscription_info=sub_info,
                data=payload_json,
                vapid_private_key=VAPID_PRIVATE_KEY_PATH,
                vapid_claims=VAPID_CLAIMS,
                ttl=3600,
            )
        except WebPushException as ex:
            # 404/410 means subscription expired or uninstalled
            if ex.response is not None and ex.response.status_code in (404, 410):
                remove_push_subscription(sub['endpoint'])
        except Exception:
            pass


def send_push_notification_to_profile(
    room_code: str,
    target_profile_id: str,
    title: str,
    body: str,
    url: Optional[str] = None
) -> None:
    subs = get_push_subscriptions(room_code, target_profile_id)
    if not subs:
        return

    payload = {
        'title': title,
        'body': body,
        'url': url or f'/uygun-musun-{target_profile_id}',
        'icon': '/icon-192x192.png',
        'badge': '/icon-192x192.png',
        'tag': f'uygun-musun-{int(time.time())}',
    }
    payload_json = json.dumps(payload, ensure_ascii=False)

    # Arka planda thread olarak gönder ki API isteği beklemesin
    t = threading.Thread(target=_dispatch_push_worker, args=(subs, payload_json), daemon=True)
    t.start()


