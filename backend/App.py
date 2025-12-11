# --- 3. RUTELE SERVERULUI ---

from flask import Flask, jsonify, request
from flask_cors import CORS  # NOU: Permite frontend-ului să se conecteze
from dotenv import load_dotenv
import os
import google.generativeai as genai
from supabase import create_client, Client
from gtts import gTTS
import base64
import io

# --- 1. CONFIGURARE ---
load_dotenv()
app = Flask(__name__)
CORS(app) # NOU: Activăm CORS pentru toate rutele

# Configurare Gemini
API_KEY = os.getenv("GOOGLE_API_KEY")
model = None

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        # Folosim modelul disponibil (gemini-2.5-pro sau gemini-pro)
        model = genai.GenerativeModel('gemini-2.5-flash') 
        print("✅ Gemini configurat corect.")
    except Exception as e:
        print(f"❌ Eroare configurare Gemini: {e}")

# Configurare Supabase
SUPA_URL = os.getenv("SUPABASE_URL")
SUPA_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = None

if SUPA_URL and SUPA_KEY:
    try:
        supabase = create_client(SUPA_URL, SUPA_KEY)
        print("✅ Conectat la Supabase.")
    except Exception as e:
        print(f"❌ Eroare Supabase: {e}")

# --- 2. FUNCȚII AJUTĂTOARE ---

def get_supabase_history(session_id):
    """
    Descarcă ultimele 10 mesaje din Supabase pentru a-i da context lui Gemini.
    """
    if not supabase:
        return []
        
    try:
        response = supabase.table('mesaje')\
            .select("sender, content")\
            .eq("session_id", session_id)\
            .order("id", desc=True)\
            .limit(10)\
            .execute()
        
        # Le inversăm ca să fie în ordine cronologică (vechi -> nou)
        messages = response.data[::-1]
        
        formatted_history = []
        for msg in messages:
            role = "user" if msg['sender'] == 'user' else "model"
            formatted_history.append({"role": role, "parts": [msg['content']]})
            
        return formatted_history
    except Exception as e:
        print(f"Eroare la preluarea istoricului: {e}")
        return []

def text_to_audio_base64(text):
    """
    Generează audio din text și îl transformă într-un cod (Base64).
    """
    try:
        mp3_fp = io.BytesIO()
        tts = gTTS(text=text, lang='ro')
        tts.write_to_fp(mp3_fp)
        mp3_fp.seek(0)
        
        audio_b64 = base64.b64encode(mp3_fp.read()).decode('utf-8')
        return audio_b64
    except Exception as e:
        print(f"Eroare TTS: {e}")
        return None

# --- 3. RUTELE SERVERULUI ---

@app.route('/')
def home():
    return "Serverul VoiceBot este activ! 🧠🔊"

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message')
    session_id = data.get('session_id', 'sesiune_default')
    custom_instruction = data.get('custom_instruction', None)

    if not user_message:
        return jsonify({"error": "Mesaj gol"}), 400

    print(f"📩 [{session_id}] User: {user_message}")

    # Pasul 1: Salvăm mesajul utilizatorului
    if supabase:
        try:
            supabase.table('mesaje').insert({
                "session_id": session_id,
                "sender": "user",
                "content": user_message
            }).execute()
        except Exception as e:
            print(f"Eroare salvare user: {e}")

    # Pasul 2: Apelăm Gemini
    bot_response_text = ""
    try:
        if model:
            history = get_supabase_history(session_id)
            # Adaugă instrucțiunea custom ca prim mesaj de sistem dacă există
            if custom_instruction:
                history = [{"role": "system", "parts": [custom_instruction]}] + history
            chat_session = model.start_chat(history=history)
            response = chat_session.send_message(user_message)

            # Curățăm textul
            text_brut = response.text
            bot_response_text = text_brut.replace("**", "").replace("*", "").replace("#", "")
        else:
            bot_response_text = "Eroare: Modelul Gemini nu este configurat."

    except Exception as e:
        print(f"Eroare Gemini: {e}")
        bot_response_text = "Îmi pare rău, nu pot procesa cererea acum."

    # Pasul 3: Salvăm răspunsul Botului
    if supabase:
        try:
            supabase.table('mesaje').insert({
                "session_id": session_id,
                "sender": "bot",
                "content": bot_response_text
            }).execute()
        except Exception as e:
             print(f"Eroare salvare bot: {e}")

    # Pasul 4: Generăm Audio
    audio_data = text_to_audio_base64(bot_response_text)

    # Returnăm totul la Frontend
    return jsonify({
        "response": bot_response_text,
        "audio": audio_data,
        "session_id": session_id
    })

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    if not supabase:
        return jsonify([])
    try:
        # Obține toate sesiunile distincte după session_id
        response = supabase.table('mesaje')\
            .select('session_id')\
            .execute()
        session_ids = list({row['session_id'] for row in response.data if row.get('session_id')})
        # Pentru fiecare sesiune, încearcă să găsești un titlu (primul mesaj user sau "Conversație Nouă")
        sessions = []
        for sid in session_ids:
            # Caută primul mesaj user pentru titlu
            msgs = supabase.table('mesaje')\
                .select('content, sender')\
                .eq('session_id', sid)\
                .order('id', asc=True)\
                .limit(1)\
                .execute()
            title = "Conversație Nouă"
            if msgs.data and msgs.data[0]['sender'] == 'user':
                words = msgs.data[0]['content'].strip().split()
                title = (" ".join(words[:3]) + ("..." if len(words) > 3 else "")).strip()
            sessions.append({"session_id": sid, "title": title})
        return jsonify(sessions)
    except Exception as e:
        print(f"Eroare la listarea sesiunilor: {e}")
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=True, port=5000)