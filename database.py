import sqlite3
from datetime import datetime
import json
import hashlib
import secrets

DATABASE_NAME = 'mindi.db'

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create moods table (with user_id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS moods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            mood_type TEXT NOT NULL,
            intensity INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create journal entries table (with user_id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            content TEXT NOT NULL,
            mood_tags TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create insights table (with user_id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            insight_text TEXT NOT NULL,
            related_entries TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# ===================================
# User Authentication Functions
# ===================================

def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username, email, password):
    """Create a new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None

def verify_user(username, password):
    """Verify user credentials"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hash_password(password)
    cursor.execute(
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        (username, password_hash)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

def get_user_by_id(user_id):
    """Get user by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

# ===================================
# Mood Functions (Updated with user_id)
# ===================================

def add_mood(user_id, mood_type, intensity, notes=''):
    """Add a new mood entry"""
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    cursor.execute(
        'INSERT INTO moods (user_id, timestamp, mood_type, intensity, notes) VALUES (?, ?, ?, ?, ?)',
        (user_id, timestamp, mood_type, intensity, notes)
    )
    
    conn.commit()
    mood_id = cursor.lastrowid
    conn.close()
    return mood_id

def get_recent_moods(user_id, limit=10):
    """Get recent mood entries for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM moods WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        (user_id, limit)
    )
    
    moods = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return moods

def get_mood_stats(user_id, days=7):
    """Get mood statistics for the past N days"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT mood_type, COUNT(*) as count, AVG(intensity) as avg_intensity
        FROM moods
        WHERE user_id = ? AND datetime(timestamp) >= datetime('now', '-' || ? || ' days')
        GROUP BY mood_type
    ''', (user_id, days))
    
    stats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return stats

# ===================================
# Journal Functions (Updated with user_id)
# ===================================

def add_journal_entry(user_id, content, mood_tags=None):
    """Add a new journal entry"""
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    mood_tags_json = json.dumps(mood_tags) if mood_tags else None
    
    cursor.execute(
        'INSERT INTO journal_entries (user_id, timestamp, content, mood_tags) VALUES (?, ?, ?, ?)',
        (user_id, timestamp, content, mood_tags_json)
    )
    
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id

def get_recent_journal_entries(user_id, limit=10):
    """Get recent journal entries for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        (user_id, limit)
    )
    
    entries = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return entries

# ===================================
# Insights Functions (Updated with user_id)
# ===================================

def add_insight(user_id, insight_text, related_entries=None):
    """Add a new AI-generated insight"""
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    related_json = json.dumps(related_entries) if related_entries else None
    
    cursor.execute(
        'INSERT INTO insights (user_id, timestamp, insight_text, related_entries) VALUES (?, ?, ?, ?)',
        (user_id, timestamp, insight_text, related_json)
    )
    
    conn.commit()
    insight_id = cursor.lastrowid
    conn.close()
    return insight_id

def get_recent_insights(user_id, limit=5):
    """Get recent insights for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM insights WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        (user_id, limit)
    )
    
    insights = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return insights

if __name__ == '__main__':
    init_db()
