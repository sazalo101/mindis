import requests
import json
from datetime import datetime

OPENROUTER_API_KEY = ""
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "x-ai/grok-4.1-fast:free"

def generate_mood_insight(mood_data, journal_entries):
    """
    Generate personalized insights based on mood data and journal entries
    
    Args:
        mood_data: List of recent mood entries
        journal_entries: List of recent journal entries
    
    Returns:
        str: AI-generated insight
    """
    # Prepare context from mood data
    mood_summary = []
    for mood in mood_data[:5]:  # Last 5 moods
        mood_summary.append(f"{mood['mood_type']} (intensity: {mood['intensity']}/10)")
    
    # Prepare context from journal entries
    journal_summary = []
    for entry in journal_entries[:3]:  # Last 3 entries
        # Truncate long entries
        content = entry['content'][:200] + "..." if len(entry['content']) > 200 else entry['content']
        journal_summary.append(content)
    
    # Create prompt for AI
    prompt = f"""You are Mindi, an empathetic AI mental health companion. Analyze the user's recent emotional patterns and provide supportive, actionable insights.

Recent Moods: {', '.join(mood_summary) if mood_summary else 'No recent mood data'}

Recent Journal Entries:
{chr(10).join(f"- {entry}" for entry in journal_summary) if journal_summary else 'No recent journal entries'}

Provide a warm, empathetic insight that:
1. Acknowledges their emotional patterns
2. Highlights any positive trends or strengths
3. Offers gentle, actionable suggestions for emotional well-being
4. Keeps the tone supportive and non-judgmental

Keep your response concise (2-3 paragraphs) and personal."""

    try:
        response = requests.post(
            url=API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "reasoning": {"enabled": True}
            }),
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        if 'choices' in result and len(result['choices']) > 0:
            insight = result['choices'][0]['message'].get('content', '')
            return insight
        else:
            return "I'm here to support you on your journey. Keep tracking your moods and journaling - every entry helps build a clearer picture of your emotional well-being."
            
    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenRouter API: {e}")
        return "I'm having trouble connecting right now, but I'm here for you. Your feelings are valid, and taking time to reflect is a powerful step toward well-being."
    except Exception as e:
        print(f"Unexpected error: {e}")
        return "Thank you for sharing your thoughts. Remember, emotional well-being is a journey, and you're doing great by staying mindful of your feelings."

def analyze_journal_entry(entry_content, conversation_history=None):
    """
    Analyze a specific journal entry and provide empathetic feedback
    
    Args:
        entry_content: The journal entry text
        conversation_history: Optional previous conversation context
    
    Returns:
        dict: Contains 'response' and 'reasoning_details' for context preservation
    """
    messages = []
    
    if conversation_history:
        messages = conversation_history
    
    messages.append({
        "role": "user",
        "content": f"""As Mindi, an empathetic mental health companion, respond to this journal entry with warmth and understanding:

"{entry_content}"

Provide a supportive response that validates their feelings and offers gentle encouragement. Keep it brief and personal (2-3 sentences)."""
    })
    
    try:
        response = requests.post(
            url=API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": MODEL,
                "messages": messages,
                "reasoning": {"enabled": True}
            }),
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        
        if 'choices' in result and len(result['choices']) > 0:
            message = result['choices'][0]['message']
            return {
                'response': message.get('content', ''),
                'reasoning_details': message.get('reasoning_details')
            }
        else:
            return {
                'response': "Thank you for sharing. Your feelings matter, and I'm here to support you.",
                'reasoning_details': None
            }
            
    except Exception as e:
        print(f"Error analyzing journal entry: {e}")
        return {
            'response': "I appreciate you opening up. Remember, you're not alone in this journey.",
            'reasoning_details': None
        }

def get_personalized_suggestion(mood_type, intensity):
    """
    Get a quick personalized suggestion based on current mood
    
    Args:
        mood_type: Type of mood (e.g., 'happy', 'sad', 'anxious')
        intensity: Intensity level (1-10)
    
    Returns:
        str: Quick suggestion
    """
    prompt = f"""The user is feeling {mood_type} with an intensity of {intensity}/10. 
    
As Mindi, provide ONE brief, actionable suggestion (1-2 sentences) to support their emotional well-being right now. Be warm and encouraging."""

    try:
        response = requests.post(
            url=API_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "reasoning": {"enabled": True}
            }),
            timeout=20
        )
        
        response.raise_for_status()
        result = response.json()
        
        if 'choices' in result and len(result['choices']) > 0:
            return result['choices'][0]['message'].get('content', '')
        else:
            return "Take a moment to breathe deeply. You're doing great by checking in with yourself."
            
    except Exception as e:
        print(f"Error getting suggestion: {e}")
        return "Remember to be kind to yourself today. Small steps count."
