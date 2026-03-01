# run ollama pull llama3.2
# run ollama pull all-minilm
# pip install numpy

import ollama
import json
import numpy as np
import re
from datetime import datetime
from collections import OrderedDict

LLM_MODEL = "llama3.2"
EMBED_MODEL = "all-minilm"

EMOTIONS = [
   "happiness", "sadness", "stress", "calm",
   "anxiety", "excitement", "anger"
]

# THEMES = [
#    "growth", "work", "fitness", "school",
#    "sleep", "stress", "relationships"
# ]

# THEME_DESCRIPTIONS = {
#    "growth": "goals, self-improvement, learning, motivation, habits, discipline, mindset, ambition, purpose",
#    "work": "career, job, workplace, manager, coworkers, professional life, meetings, deadlines, projects",
#    "fitness": "exercise, gym, workout, physical health, sports, running, lifting, training, cardio",
#    "school": "classes, homework, exams, studying, professors, lectures, grades, assignments, campus",
#    "sleep": "rest, naps, insomnia, tired, bedtime, waking up, dreams, fatigue, energy levels",
#    "stress": "pressure, overwhelm, burnout, tension, anxiety, coping, deadlines, mental load, breaking point",
#    "relationships": "partner, girlfriend, boyfriend, family, friends, social life, love, connection, conversations",
# }
THEMES = [
    "work", "fitness", "relationships", "mental_health",
    "family", "finances", "friendships", "hobbies",
    "health", "personal_growth"
]

THEME_DESCRIPTIONS = {
    "work": "career, job, workplace, manager, coworkers, professional life, meetings, deadlines, projects, promotion, office",
    "fitness": "exercise, gym, workout, physical health, sports, running, lifting, training, cardio, personal record, gains",
    "relationships": "partner, girlfriend, boyfriend, spouse, romance, love, dating, intimacy, commitment, anniversary, connection",
    "mental_health": "emotions, feelings, mood, happiness, sadness, anxiety, depression, stress, therapy, self-esteem, overwhelm, burnout, optimism, gratitude, mental state, emotional wellbeing, how I feel",
    "family": "parents, siblings, children, relatives, home life, family dynamics, upbringing, household, mom, dad, brother, sister",
    "finances": "money, budget, savings, debt, spending, income, bills, financial goals, investments, rent, paycheck, expenses",
    "friendships": "friends, social life, hanging out, loneliness, connection, support system, social events, buddy, crew, group",
    "hobbies": "creative outlets, interests, passions, music, art, gaming, reading, side projects, painting, guitar, crafts, collecting",
    "health": "sleep, nutrition, diet, illness, doctor, medication, energy, physical wellbeing, recovery, blood work, cholesterol, symptoms",
    "personal_growth": "goals, self-improvement, learning, motivation, habits, discipline, mindset, ambition, purpose, reflection, progress, consistency",
}


# ─── Helpers ───────────────────────────────────────────────────────────────

def cosine_similarity(a, b):
   a, b = np.array(a), np.array(b)
   return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def split_sentences(text):
   """Split text into sentences on .!? boundaries."""
   return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s.strip()]

def get_embedding_raw(text):
   """Return embedding as a Python list (for cosine math)."""
   response = ollama.embeddings(model=EMBED_MODEL, prompt=text)
   return response["embedding"]

def get_embedding_str(text):
   """Return embedding as a Supabase-ready string."""
   vector = get_embedding_raw(text)
   return "[" + ",".join(str(float(x)) for x in vector) + "]"

# ─── Analyze emotions (LLM) ───────────────────────────────────────────────

def analyze_transcript(transcript):
    prompt = f"""
You are an emotional analysis engine.

Analyze the ENTIRE transcript as a whole. Return a SINGLE JSON object.

Return STRICT JSON with:
- summary (1 very short sentence)
- primary_emotion (must be one of: {EMOTIONS})
- secondary_emotion (must be one of: {EMOTIONS})
- intensity (float 0-1)
- valence (float -1 to 1)
- arousal (float 0-1)
- themes (1-4 items chosen only from: {THEMES})

Return ONE JSON object only. Do NOT analyze individual sentences. No explanation.

Transcript:
\"\"\"{transcript}\"\"\"
"""
    response = ollama.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    content = response["message"]["content"].strip()

    # Strip markdown fences
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0].strip()

    # Extract first JSON object only (handles LLM returning multiple)
    match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
    if match:
        content = match.group(0)

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Retry: ask the model to fix it
        fix_response = ollama.chat(
            model=LLM_MODEL,
            messages=[
                {"role": "user", "content": f"Fix this broken JSON. Return ONLY ONE valid JSON object, nothing else:\n{content}"}
            ]
        )
        fix_content = fix_response["message"]["content"].strip()

        if fix_content.startswith("```"):
            fix_content = fix_content.split("\n", 1)[1]
            fix_content = fix_content.rsplit("```", 1)[0].strip()

        match = re.search(r'\{[^{}]*\}', fix_content, re.DOTALL)
        if match:
            fix_content = match.group(0)

        try:
            data = json.loads(fix_content)
        except json.JSONDecodeError as e:
            raise Exception(f"Model did not return valid JSON even after retry:\n{fix_content}\n\nError: {e}")

    return data

# ─── Chunk transcript by theme (EMBEDDINGS) ───────────────────────────────
def chunk_transcript(transcript):
    # 1. Embed each theme description once
    theme_embeddings = {
        theme: get_embedding_raw(desc)
        for theme, desc in THEME_DESCRIPTIONS.items()
    }

    # 2. Split transcript into sentences
    sentences = split_sentences(transcript)

    if not sentences:
        return [{"theme": "personal_growth", "chunk": transcript.strip()}]

    # 3. Classify each sentence — best theme only
    grouped = OrderedDict()
    for sentence in sentences:
        sentence_emb = get_embedding_raw(sentence)

        best_theme = max(
            theme_embeddings,
            key=lambda t: cosine_similarity(sentence_emb, theme_embeddings[t])
        )

        if best_theme not in grouped:
            grouped[best_theme] = []
        grouped[best_theme].append(sentence)

    # 4. Merge into one chunk per theme
    chunks = [
        {"theme": theme, "chunk": " ".join(sents)}
        for theme, sents in grouped.items()
    ]

    return chunks

# ─── Validation ────────────────────────────────────────────────────────────

def validate_output(data):
    if data.get("primary_emotion") not in EMOTIONS:
        data["primary_emotion"] = "calm"
    if data.get("secondary_emotion") not in EMOTIONS:
        data["secondary_emotion"] = data["primary_emotion"]

    data["intensity"] = max(0, min(1, float(data.get("intensity", 0.5))))
    data["arousal"]   = max(0, min(1, float(data.get("arousal", 0.5))))
    data["valence"]   = max(-1, min(1, float(data.get("valence", 0.0))))

    data["summary"] = data.get("summary", "No summary available.")

    valid_themes = [t for t in data.get("themes", []) if t in THEMES]
    if not valid_themes:
        valid_themes = ["personal_growth"]
    data["themes"] = valid_themes[:4]

    return data

# ─── Build both rows ──────────────────────────────────────────────────────

def build_row(transcript):
    analysis = analyze_transcript(transcript)
    analysis = validate_output(analysis)

    now = datetime.now()

    journal_entry = {
    "transcript":        transcript,
    "summary":           analysis["summary"],
    "primary_emotion":   analysis["primary_emotion"],
    "secondary_emotion": analysis["secondary_emotion"],
    "intensity":         analysis["intensity"],
    "valence":           analysis["valence"],
    "arousal":           analysis["arousal"],
    "themes":            analysis["themes"],
    "entry_date":        now.date().isoformat(),
    "created_at":        now.isoformat()
    }

    chunks = chunk_transcript(transcript)

    theme_rows = []
    for c in chunks:
        theme_rows.append({
            "theme":     c["theme"],
            "chunk":     c["chunk"],
            "embedding": get_embedding_str(c["chunk"])
        })

    return journal_entry, theme_rows

# ─── Test ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":

   transcript = """
   Got into a fight with my mom again. She keeps bringing up how I should move closer to home and it drives me crazy. I love her but she doesn't understand that I need my own space. Called my sister after and she helped me calm down. Family stuff is so complicated.
   """

   journal_entry, theme_rows = build_row(transcript)

   print("=== JOURNAL ENTRY ===")
   print(json.dumps(journal_entry, indent=2))

   print("\n=== THEME EMBEDDINGS ===")
   for i, row in enumerate(theme_rows):
       preview = {
           "theme": row["theme"],
           "chunk": row["chunk"],
           "embedding": row["embedding"][:50] + "..."
       }
       print(f"  chunk {i+1}: {json.dumps(preview, indent=4)}")





