import sqlite3
import os

STATS_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stats.db')

# Base counts stored as env vars so Render deploys don't reset accumulated stats
BASE_GENERATED = int(os.environ.get('STATS_BASE_GENERATED', '0'))
BASE_VISITS = int(os.environ.get('STATS_BASE_VISITS', '0'))

def init_stats_db():
    conn = sqlite3.connect(STATS_DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS stats (id INTEGER PRIMARY KEY, total_generated INTEGER, total_visits INTEGER DEFAULT 0)''')
    try:
        c.execute('''ALTER TABLE stats ADD COLUMN total_visits INTEGER DEFAULT 0''')
    except:
        pass
    c.execute('''SELECT COUNT(*) FROM stats''')
    if c.fetchone()[0] == 0:
        c.execute('''INSERT INTO stats (id, total_generated, total_visits) VALUES (1, 0, 0)''')
    conn.commit()
    conn.close()

init_stats_db()

def increment_stat(field='total_generated'):
    conn = sqlite3.connect(STATS_DB_PATH)
    c = conn.cursor()
    if field == 'total_visits':
        c.execute('''UPDATE stats SET total_visits = total_visits + 1 WHERE id = 1''')
    else:
        c.execute('''UPDATE stats SET total_generated = total_generated + 1 WHERE id = 1''')
    conn.commit()
    conn.close()

def get_stats():
    conn = sqlite3.connect(STATS_DB_PATH)
    c = conn.cursor()
    c.execute('''SELECT total_generated, total_visits FROM stats WHERE id = 1''')
    row = c.fetchone()
    conn.close()
    return {
        'total_generated': row[0] + BASE_GENERATED,
        'total_visits': row[1] + BASE_VISITS
    }
