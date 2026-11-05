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
import random
import secrets
import sqlite3
import threading
from typing import Dict, Any, Optional, List

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


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(STORE_DB_PATH, timeout=10)
    conn.execute('PRAGMA synchronous = NORMAL;')
    conn.execute('PRAGMA busy_timeout = 5000;')
    return conn


def _init_db() -> None:
    with _DB_LOCK:
        conn = _get_conn()
        try:
            conn.execute('PRAGMA journal_mode = WAL;')
            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS rooms (
                    room_code TEXT PRIMARY KEY,
                    title TEXT,
                    admin_token TEXT,
                    created_at INTEGER,
                    data_json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
                '''
            )
            # Mevcut veritabanında eksik sütunlar varsa otomatik ekle (Migration)
            existing_cols = {
                row[1] for row in conn.execute('PRAGMA table_info(rooms)').fetchall()
            }
            if 'title' not in existing_cols:
                conn.execute('ALTER TABLE rooms ADD COLUMN title TEXT')
            if 'admin_token' not in existing_cols:
                conn.execute('ALTER TABLE rooms ADD COLUMN admin_token TEXT')
            if 'created_at' not in existing_cols:
                conn.execute('ALTER TABLE rooms ADD COLUMN created_at INTEGER')

            conn.execute(
                '''
                CREATE TABLE IF NOT EXISTS room_members (
                    room_code TEXT NOT NULL,
                    profile_id TEXT NOT NULL,
                    device_token TEXT NOT NULL DEFAULT '',
                    role TEXT DEFAULT 'member',
                    joined_at INTEGER NOT NULL,
                    PRIMARY KEY (room_code, profile_id)
                )
                '''
            )
            conn.execute(
                '''
                CREATE INDEX IF NOT EXISTS idx_room_members ON room_members (room_code)
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
    if room_code == 'atilla-neva':
        return {
            'room_code': room_code,
            'title': 'Atilla & Neva',
            'created_at': now_ms,
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
    return {
        'room_code': room_code,
        'title': f'Kampüs Lobisi #{room_code.upper()}',
        'created_at': now_ms,
        'updated_at': now_ms,
        'pings': [],
        'profiles': [],
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
    room['pings'] = valid_pings[-15:]
    return room


def _generate_unique_room_code(conn: sqlite3.Connection) -> str:
    alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    cur = conn.cursor()
    for _ in range(30):
        candidate = ''.join(random.choice(alphabet) for _ in range(6)).lower()
        cur.execute('SELECT 1 FROM rooms WHERE room_code = ?', (candidate,))
        if not cur.fetchone():
            return candidate
    return f"ytu{random.randint(100, 999)}"


def get_room(room_code: str, create_if_missing: bool = True) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    with _DB_LOCK:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute('SELECT data_json, title, created_at FROM rooms WHERE room_code = ?', (code,))
            row = cur.fetchone()
            if not row:
                if not create_if_missing and code != 'atilla-neva':
                    raise KeyError('Bu koda ait bir lobi bulunamadı.')
                default_state = _default_room_state(code)
                conn.execute(
                    '''
                    INSERT INTO rooms (room_code, title, created_at, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (
                        code,
                        default_state.get('title') or f'Lobi #{code.upper()}',
                        default_state['updated_at'],
                        json.dumps(default_state, ensure_ascii=False),
                        default_state['updated_at'],
                    ),
                )
                conn.commit()
                return default_state
            room = json.loads(row[0])
            if row[1] and not room.get('title'):
                room['title'] = row[1]
            if not room.get('title'):
                room['title'] = 'Atilla & Neva' if code == 'atilla-neva' else f'Lobi #{code.upper()}'
            if row[2] and not room.get('created_at'):
                room['created_at'] = row[2]
            return _clean_expired_statuses(room)
        finally:
            conn.close()


def save_room(room_code: str, room_data: Dict[str, Any], admin_token: Optional[str] = None) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    now_ms = int(time.time() * 1000)
    room_data['room_code'] = code
    room_data['updated_at'] = now_ms
    if not room_data.get('title'):
        room_data['title'] = 'Atilla & Neva' if code == 'atilla-neva' else f'Lobi #{code.upper()}'
    room_data = _clean_expired_statuses(room_data)
    title_str = str(room_data.get('title') or '')[:60]
    created_ms = int(room_data.get('created_at') or now_ms)

    with _DB_LOCK:
        conn = _get_conn()
        try:
            if admin_token:
                conn.execute(
                    '''
                    INSERT INTO rooms (room_code, title, admin_token, created_at, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(room_code) DO UPDATE SET
                        title = excluded.title,
                        data_json = excluded.data_json,
                        updated_at = excluded.updated_at
                    ''',
                    (code, title_str, admin_token, created_ms, json.dumps(room_data, ensure_ascii=False), now_ms),
                )
            else:
                conn.execute(
                    '''
                    INSERT INTO rooms (room_code, title, created_at, data_json, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(room_code) DO UPDATE SET
                        title = excluded.title,
                        data_json = excluded.data_json,
                        updated_at = excluded.updated_at
                    ''',
                    (code, title_str, created_ms, json.dumps(room_data, ensure_ascii=False), now_ms),
                )
            conn.commit()
        finally:
            conn.close()
    return room_data


def _sanitize_schedule(schedule_data: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(schedule_data, dict):
        return None
    cleaned = dict(schedule_data)
    cleaned.pop('student_id', None)
    cleaned.pop('tc_no', None)
    return cleaned


def create_room(
    title: str,
    creator_profile: Dict[str, Any],
    device_token: str = ''
) -> Dict[str, Any]:
    clean_title = str(title or 'Kampüs Lobisi').strip()[:50] or 'Kampüs Lobisi'
    now_ms = int(time.time() * 1000)
    admin_token = secrets.token_hex(12)

    pid = str(creator_profile.get('id') or '').strip()
    if not pid:
        pid = f"u_{now_ms}_{secrets.token_hex(2)}"

    schedule_data = _sanitize_schedule(creator_profile.get('schedule'))
    owner_profile = {
        'id': pid,
        'name': str(creator_profile.get('name') or 'Kurucu').strip()[:25] or 'Kurucu',
        'color': str(creator_profile.get('color') or 'blue')[:20],
        'avatar': str(creator_profile.get('avatar') or '👨‍💻')[:8],
        'role': 'owner',
        'schedule': schedule_data,
        'custom_status': None,
    }

    with _DB_LOCK:
        conn = _get_conn()
        try:
            code = _generate_unique_room_code(conn)
            room_data = {
                'room_code': code,
                'title': clean_title,
                'owner_profile_id': pid,
                'created_at': now_ms,
                'updated_at': now_ms,
                'pings': [],
                'profiles': [owner_profile],
            }
            conn.execute(
                '''
                INSERT INTO rooms (room_code, title, admin_token, created_at, data_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ''',
                (code, clean_title, admin_token, now_ms, json.dumps(room_data, ensure_ascii=False), now_ms),
            )
            conn.execute(
                '''
                INSERT OR REPLACE INTO room_members (room_code, profile_id, device_token, role, joined_at)
                VALUES (?, ?, ?, 'owner', ?)
                ''',
                (code, pid, str(device_token or '')[:64], now_ms),
            )
            conn.commit()
        finally:
            conn.close()

    return {
        'room_code': code,
        'title': clean_title,
        'admin_token': admin_token,
        'my_profile_id': pid,
        'room': room_data,
    }


def join_room(
    room_code: str,
    profile_payload: Dict[str, Any],
    device_token: str = ''
) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    # Odanın gerçekten var olduğundan emin ol
    room = get_room(code, create_if_missing=(code == 'atilla-neva'))
    profiles = room.get('profiles', [])
    now_ms = int(time.time() * 1000)

    pid = str(profile_payload.get('id') or '').strip()
    if not pid:
        pid = f"u_{now_ms}_{secrets.token_hex(2)}"

    schedule_data = _sanitize_schedule(profile_payload.get('schedule'))
    existing_idx = next((i for i, p in enumerate(profiles) if p.get('id') == pid), -1)

    if existing_idx >= 0:
        cur = profiles[existing_idx]
        if profile_payload.get('name'):
            cur['name'] = str(profile_payload['name']).strip()[:25]
        if profile_payload.get('color'):
            cur['color'] = str(profile_payload['color'])[:20]
        if profile_payload.get('avatar'):
            cur['avatar'] = str(profile_payload['avatar'])[:8]
        if 'schedule' in profile_payload and schedule_data is not None:
            cur['schedule'] = schedule_data
        profiles[existing_idx] = cur
    else:
        if len(profiles) >= 16:
            raise ValueError('Bir lobide en fazla 16 üye bulunabilir.')
        profiles.append({
            'id': pid,
            'name': str(profile_payload.get('name') or 'Arkadaş').strip()[:25] or 'Arkadaş',
            'color': str(profile_payload.get('color') or 'emerald')[:20],
            'avatar': str(profile_payload.get('avatar') or '🎓')[:8],
            'role': 'member',
            'schedule': schedule_data,
            'custom_status': None,
        })

    room['profiles'] = profiles
    saved_room = save_room(code, room)

    with _DB_LOCK:
        conn = _get_conn()
        try:
            conn.execute(
                '''
                INSERT OR REPLACE INTO room_members (room_code, profile_id, device_token, role, joined_at)
                VALUES (?, ?, ?, 'member', ?)
                ''',
                (code, pid, str(device_token or '')[:64], now_ms),
            )
            conn.commit()
        finally:
            conn.close()

    return {
        'room_code': code,
        'title': saved_room.get('title') or f'Lobi #{code.upper()}',
        'my_profile_id': pid,
        'room': saved_room,
    }


def update_room_title(room_code: str, new_title: str) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    room = get_room(code, create_if_missing=False)
    clean_title = str(new_title or '').strip()[:50]
    if not clean_title:
        raise ValueError('Lobi adı boş olamaz.')
    room['title'] = clean_title
    return save_room(code, room)


def get_my_rooms_summary(room_codes: List[str]) -> List[Dict[str, Any]]:
    if not room_codes:
        return []
    cleaned_codes = []
    seen = set()
    for rc in room_codes[:25]:
        c = _sanitize_room_code(rc)
        if c and c not in seen and c != 'atilla-neva':
            seen.add(c)
            cleaned_codes.append(c)

    if not cleaned_codes:
        return []

    placeholders = ','.join('?' for _ in cleaned_codes)
    out = []
    with _DB_LOCK:
        conn = _get_conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f'SELECT room_code, title, data_json, updated_at FROM rooms WHERE room_code IN ({placeholders})',
                tuple(cleaned_codes),
            )
            rows = cur.fetchall()
            row_map = {r[0]: r for r in rows}
            for c in cleaned_codes:
                r = row_map.get(c)
                if not r:
                    continue
                try:
                    data = json.loads(r[2])
                except Exception:
                    data = {}
                profiles = data.get('profiles', [])
                title = r[1] or data.get('title') or f'Lobi #{c.upper()}'
                out.append({
                    'room_code': c,
                    'title': title,
                    'member_count': len(profiles),
                    'members': [
                        {
                            'id': p.get('id'),
                            'name': p.get('name'),
                            'avatar': p.get('avatar'),
                            'color': p.get('color'),
                        }
                        for p in profiles[:8]
                    ],
                    'updated_at': r[3] or data.get('updated_at') or 0,
                })
        finally:
            conn.close()
    return out


def upsert_profile(room_code: str, profile_payload: Dict[str, Any]) -> Dict[str, Any]:
    room = get_room(room_code)
    profiles = room.get('profiles', [])
    pid = str(profile_payload.get('id') or '').strip()
    if not pid:
        pid = f"p_{int(time.time() * 1000)}"

    schedule_data = _sanitize_schedule(profile_payload.get('schedule'))

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
        if len(profiles) >= 16:
            raise ValueError('Bir lobide en fazla 16 profil bulunabilir.')
        profiles.append({
            'id': pid,
            'name': str(profile_payload.get('name') or 'Arkadaş')[:25],
            'color': str(profile_payload.get('color') or 'emerald')[:20],
            'avatar': str(profile_payload.get('avatar') or '🎓')[:8],
            'role': str(profile_payload.get('role') or 'member')[:12],
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
    code = _sanitize_room_code(room_code)
    if code == 'atilla-neva':
        room = get_room(code)
        profiles = room.get('profiles', [])
        if len(profiles) <= 2:
            raise ValueError('Bu özel odada en az 2 profil kalmalıdır.')
        room['profiles'] = [p for p in profiles if p.get('id') != profile_id]
        return save_room(code, room)

    room = get_room(code, create_if_missing=False)
    profiles = room.get('profiles', [])
    remaining = [p for p in profiles if p.get('id') != profile_id]

    # Eğer lobide kimse kalmadıysa lobiyi tamamen sil
    if len(remaining) == 0:
        with _DB_LOCK:
            conn = _get_conn()
            try:
                conn.execute('DELETE FROM rooms WHERE room_code = ?', (code,))
                conn.execute('DELETE FROM room_members WHERE room_code = ?', (code,))
                conn.execute('DELETE FROM push_subscriptions WHERE room_code = ?', (code,))
                conn.commit()
            finally:
                conn.close()
        return {'room_code': code, 'deleted': True, 'profiles': []}

    # Eğer ayrılan kişi liderse (owner), sıradaki ilk üyeyi otomatik yeni lider yap
    was_owner = (
        room.get('owner_profile_id') == profile_id
        or any(p.get('id') == profile_id and p.get('role') == 'owner' for p in profiles)
    )
    new_owner_id = None
    if was_owner or not any(p.get('role') == 'owner' for p in remaining):
        remaining[0]['role'] = 'owner'
        new_owner_id = remaining[0].get('id')
        room['owner_profile_id'] = new_owner_id

    room['profiles'] = remaining
    with _DB_LOCK:
        conn = _get_conn()
        try:
            conn.execute(
                'DELETE FROM room_members WHERE room_code = ? AND profile_id = ?',
                (code, profile_id),
            )
            conn.execute(
                'DELETE FROM push_subscriptions WHERE room_code = ? AND profile_id = ?',
                (code, profile_id),
            )
            if new_owner_id:
                conn.execute(
                    "UPDATE room_members SET role = 'owner' WHERE room_code = ? AND profile_id = ?",
                    (code, new_owner_id),
                )
            conn.commit()
        finally:
            conn.close()
    return save_room(code, room)


def delete_room(
    room_code: str,
    admin_token: Optional[str] = None,
    requester_profile_id: Optional[str] = None,
) -> Dict[str, Any]:
    code = _sanitize_room_code(room_code)
    if code == 'atilla-neva':
        raise ValueError('Bu özel oda kapatılamaz.')

    room = get_room(code, create_if_missing=False)
    profiles = room.get('profiles', [])
    owner_id = (
        room.get('owner_profile_id')
        or next((p.get('id') for p in profiles if p.get('role') == 'owner'), None)
        or (profiles[0].get('id') if profiles else None)
    )

    with _DB_LOCK:
        conn = _get_conn()
        try:
            row = conn.execute(
                'SELECT admin_token, title FROM rooms WHERE room_code = ?',
                (code,),
            ).fetchone()
            if not row:
                raise KeyError(f'Lobi bulunamadı: {code}')
            db_token = row[0] or ''
            room_title = row[1] or room.get('title') or f'Lobi #{code.upper()}'

            # Yetki kontrolü: admin_token eşleşmeli VEYA requester_profile_id kurucu olmalı
            is_authorized = False
            if admin_token and db_token and secrets.compare_digest(str(admin_token), str(db_token)):
                is_authorized = True
            elif requester_profile_id and owner_id and str(requester_profile_id) == str(owner_id):
                is_authorized = True
            elif len(profiles) <= 1:
                is_authorized = True

            if not is_authorized:
                raise PermissionError('Sadece grup lideri (kurucu) lobiyi tamamen kapatabilir.')
        finally:
            conn.close()

    # Lobideki diğer üyelere bildirim gönder (silmeden önce)
    if requester_profile_id:
        try:
            send_push_notification_to_room(
                code,
                requester_profile_id,
                '🗑️ Lobi Kapatıldı',
                f"'{room_title}' lobisi grup lideri tarafından kapatıldı.",
                '/uygun-musun',
            )
        except Exception:
            pass

    with _DB_LOCK:
        conn = _get_conn()
        try:
            conn.execute('DELETE FROM rooms WHERE room_code = ?', (code,))
            conn.execute('DELETE FROM room_members WHERE room_code = ?', (code,))
            conn.execute('DELETE FROM push_subscriptions WHERE room_code = ?', (code,))
            conn.commit()
        finally:
            conn.close()

    return {'status': 'deleted', 'room_code': code, 'title': room_title}


def send_ping(
    room_code: str,
    from_id: str,
    to_id: str,
    ping_type: str,
    message: str = '',
    emoji: str = '☕'
) -> Dict[str, Any]:
    room = get_room(room_code)
    profiles = room.get('profiles', [])
    sender = next((p for p in profiles if p.get('id') == from_id), None)
    sender_name = sender.get('name') if sender else from_id
    sender_avatar = sender.get('avatar') if sender else '👋'

    pings = room.get('pings', [])
    now_ms = int(time.time() * 1000)
    ping_id = f"ping_{now_ms}_{from_id}"
    new_ping = {
        'id': ping_id,
        'from_id': from_id,
        'from_name': sender_name,
        'from_avatar': sender_avatar,
        'to_id': to_id,
        'type': ping_type,
        'message': message[:120],
        'emoji': emoji[:8],
        'created_at': now_ms,
        'dismissed': False,
        'dismissed_by': [],
    }
    pings.append(new_ping)
    room['pings'] = pings[-15:]
    return save_room(room_code, room)


def dismiss_ping(room_code: str, ping_id: str, profile_id: Optional[str] = None) -> Dict[str, Any]:
    room = get_room(room_code)
    pings = room.get('pings', [])
    for p in pings:
        if p.get('id') == ping_id:
            if profile_id and p.get('to_id') == 'all' and p.get('from_id') != profile_id:
                dismissed_by = p.get('dismissed_by')
                if not isinstance(dismissed_by, list):
                    dismissed_by = []
                if profile_id not in dismissed_by:
                    dismissed_by.append(profile_id)
                p['dismissed_by'] = dismissed_by
            else:
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
        conn = _get_conn()
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
        conn = _get_conn()
        try:
            conn.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', (endpoint_clean,))
            conn.commit()
        finally:
            conn.close()


def get_push_subscriptions(room_code: str, profile_id: str) -> list:
    clean_code = _sanitize_room_code(room_code)
    with _DB_LOCK:
        conn = _get_conn()
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


def get_room_push_subscriptions(room_code: str, exclude_profile_id: Optional[str] = None) -> list:
    clean_code = _sanitize_room_code(room_code)
    with _DB_LOCK:
        conn = _get_conn()
        conn.row_factory = sqlite3.Row
        try:
            if exclude_profile_id:
                rows = conn.execute(
                    '''
                    SELECT endpoint, p256dh, auth, profile_id FROM push_subscriptions
                    WHERE room_code = ? AND profile_id != ?
                    ''',
                    (clean_code, exclude_profile_id),
                ).fetchall()
            else:
                rows = conn.execute(
                    '''
                    SELECT endpoint, p256dh, auth, profile_id FROM push_subscriptions
                    WHERE room_code = ?
                    ''',
                    (clean_code,),
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
    clean_code = _sanitize_room_code(room_code)
    subs = get_push_subscriptions(clean_code, target_profile_id)
    if not subs:
        return

    default_url = (
        f'/uygun-musun-{target_profile_id}'
        if clean_code == 'atilla-neva'
        else f'/uygun-musun?join={clean_code.upper()}'
    )
    payload = {
        'title': title,
        'body': body,
        'url': url or default_url,
        'icon': '/icon-192x192.png',
        'badge': '/icon-192x192.png',
        'tag': f'uygun-musun-{int(time.time())}',
    }
    payload_json = json.dumps(payload, ensure_ascii=False)

    # Arka planda thread olarak gönder ki API isteği beklemesin
    t = threading.Thread(target=_dispatch_push_worker, args=(subs, payload_json), daemon=True)
    t.start()


def send_push_notification_to_room(
    room_code: str,
    exclude_profile_id: str,
    title: str,
    body: str,
    url: Optional[str] = None
) -> None:
    clean_code = _sanitize_room_code(room_code)
    subs = get_room_push_subscriptions(clean_code, exclude_profile_id)
    if not subs:
        return

    default_url = (
        '/uygun-musun-neva'
        if clean_code == 'atilla-neva' and exclude_profile_id == 'atilla'
        else '/uygun-musun-atilla'
        if clean_code == 'atilla-neva'
        else f'/uygun-musun?join={clean_code.upper()}'
    )
    payload = {
        'title': title,
        'body': body,
        'url': url or default_url,
        'icon': '/icon-192x192.png',
        'badge': '/icon-192x192.png',
        'tag': f'uygun-musun-room-{clean_code}-{int(time.time())}',
    }
    payload_json = json.dumps(payload, ensure_ascii=False)

    t = threading.Thread(target=_dispatch_push_worker, args=(subs, payload_json), daemon=True)
    t.start()


