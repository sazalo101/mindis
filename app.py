from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import database
import ai_service
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'mindi-secret-key-change-in-production-2024'  # Change this in production!

# ===================================
# Authentication Decorator
# ===================================

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# ===================================
# Authentication Routes
# ===================================

@app.route('/')
def index():
    """Render landing page"""
    return render_template('landing.html')

@app.route('/login', methods=['GET'])
def login_page():
    """Render login page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register_page():
    """Render registration page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    """Render the main dashboard"""
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    user = database.get_user_by_id(session['user_id'])
    if not user:
        # User not found, clear session and redirect to login
        session.clear()
        return redirect(url_for('login_page'))
    
    return render_template('dashboard.html', user=user)

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # Validation
        if not username or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Create user
        user_id = database.create_user(username, email, password)
        
        if user_id is None:
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Auto-login after registration
        session['user_id'] = user_id
        session['username'] = username
        
        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'user_id': user_id
        })
    
    except Exception as e:
        print(f"Error during registration: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Verify credentials
        user = database.verify_user(username, password)
        
        if user is None:
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create session
        session['user_id'] = user['id']
        session['username'] = user['username']
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        })
    
    except Exception as e:
        print(f"Error during login: {e}")
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

# ===================================
# Mood Routes (Protected)
# ===================================

@app.route('/api/mood', methods=['POST'])
@login_required
def add_mood():
    """Add a new mood entry"""
    try:
        data = request.get_json()
        mood_type = data.get('mood_type')
        intensity = data.get('intensity', 5)
        notes = data.get('notes', '')
        
        if not mood_type:
            return jsonify({'error': 'Mood type is required'}), 400
        
        user_id = session['user_id']
        mood_id = database.add_mood(user_id, mood_type, intensity, notes)
        
        # Get AI suggestion
        suggestion = ai_service.get_personalized_suggestion(mood_type, intensity)
        
        return jsonify({
            'success': True,
            'mood_id': mood_id,
            'suggestion': suggestion
        })
    
    except Exception as e:
        print(f"Error adding mood: {e}")
        return jsonify({'error': 'Failed to add mood'}), 500

@app.route('/api/mood', methods=['GET'])
@login_required
def get_moods():
    """Get recent mood entries"""
    try:
        limit = request.args.get('limit', 10, type=int)
        user_id = session['user_id']
        moods = database.get_recent_moods(user_id, limit)
        return jsonify({'moods': moods})
    
    except Exception as e:
        print(f"Error getting moods: {e}")
        return jsonify({'error': 'Failed to retrieve moods'}), 500

@app.route('/api/mood/stats', methods=['GET'])
@login_required
def get_mood_stats():
    """Get mood statistics"""
    try:
        days = request.args.get('days', 7, type=int)
        user_id = session['user_id']
        stats = database.get_mood_stats(user_id, days)
        return jsonify({'stats': stats})
    
    except Exception as e:
        print(f"Error getting mood stats: {e}")
        return jsonify({'error': 'Failed to retrieve mood statistics'}), 500

# ===================================
# Journal Routes (Protected)
# ===================================

@app.route('/api/journal', methods=['POST'])
@login_required
def add_journal():
    """Add a new journal entry"""
    try:
        data = request.get_json()
        content = data.get('content')
        mood_tags = data.get('mood_tags', [])
        
        if not content or len(content.strip()) == 0:
            return jsonify({'error': 'Journal content is required'}), 400
        
        user_id = session['user_id']
        entry_id = database.add_journal_entry(user_id, content, mood_tags)
        
        # Get AI analysis
        analysis = ai_service.analyze_journal_entry(content)
        
        return jsonify({
            'success': True,
            'entry_id': entry_id,
            'ai_response': analysis['response']
        })
    
    except Exception as e:
        print(f"Error adding journal entry: {e}")
        return jsonify({'error': 'Failed to add journal entry'}), 500

@app.route('/api/journal', methods=['GET'])
@login_required
def get_journal_entries():
    """Get recent journal entries"""
    try:
        limit = request.args.get('limit', 10, type=int)
        user_id = session['user_id']
        entries = database.get_recent_journal_entries(user_id, limit)
        return jsonify({'entries': entries})
    
    except Exception as e:
        print(f"Error getting journal entries: {e}")
        return jsonify({'error': 'Failed to retrieve journal entries'}), 500

# ===================================
# Insights Routes (Protected)
# ===================================

@app.route('/api/insights', methods=['POST'])
@login_required
def generate_insights():
    """Generate AI-powered insights"""
    try:
        user_id = session['user_id']
        moods = database.get_recent_moods(user_id, 10)
        journal_entries = database.get_recent_journal_entries(user_id, 5)
        
        # Generate insight
        insight_text = ai_service.generate_mood_insight(moods, journal_entries)
        
        # Save insight
        entry_ids = [entry['id'] for entry in journal_entries]
        insight_id = database.add_insight(user_id, insight_text, entry_ids)
        
        return jsonify({
            'success': True,
            'insight_id': insight_id,
            'insight': insight_text
        })
    
    except Exception as e:
        print(f"Error generating insights: {e}")
        return jsonify({'error': 'Failed to generate insights'}), 500

@app.route('/api/insights', methods=['GET'])
@login_required
def get_insights():
    """Get recent insights"""
    try:
        limit = request.args.get('limit', 5, type=int)
        user_id = session['user_id']
        insights = database.get_recent_insights(user_id, limit)
        return jsonify({'insights': insights})
    
    except Exception as e:
        print(f"Error getting insights: {e}")
        return jsonify({'error': 'Failed to retrieve insights'}), 500

# ===================================
# Dashboard Data Route (Protected)
# ===================================

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    """Get all data for the dashboard"""
    try:
        user_id = session['user_id']
        moods = database.get_recent_moods(user_id, 20)
        journal_entries = database.get_recent_journal_entries(user_id, 5)
        insights = database.get_recent_insights(user_id, 3)
        stats = database.get_mood_stats(user_id, 7)
        
        return jsonify({
            'moods': moods,
            'journal_entries': journal_entries,
            'insights': insights,
            'stats': stats
        })
    
    except Exception as e:
        print(f"Error getting dashboard data: {e}")
        return jsonify({'error': 'Failed to retrieve dashboard data'}), 500

if __name__ == '__main__':
    database.init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
