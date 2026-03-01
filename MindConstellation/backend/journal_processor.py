# run ollama pull lamma3.2

import ollama
import json
from datetime import datetime

LLM_MODEL = "llama3.2"
EMBED_MODEL = "all-minilm"

EMOTIONS = [
    "happiness",
    "sadness",
    "stress",
    "calm",
    "anxiety",
    "excitement",
    "anger"
]

THEMES = [
    "growth",
    "work",
    "fitness",
    "school",
    "sleep",
    "stress",
    "relationships"
]

def analyze_transcript(transcript):
    prompt = f"""
You are an emotional analysis engine.

Return STRICT JSON with:
- summary (1 very short sentence)
- primary_emotion (must be one of: {EMOTIONS})
- secondary_emotion (must be one of: {EMOTIONS})
- intensity (float 0-1)
- valence (float -1 to 1)
- arousal (float 0-1)
- themes (1-4 items chosen only from: {THEMES})

Return JSON only. No explanation.

Transcript:
\"\"\"{transcript}\"\"\"
"""

    response = ollama.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )

    content = response["message"]["content"]

    try:
        data = json.loads(content)
    except:
        raise Exception("Model did not return valid JSON:\n" + content)

    return data

def get_embedding(text):
    response = ollama.embeddings(
        model=EMBED_MODEL,
        prompt=text
    )
    vector = response["embedding"]

    return "[" + ",".join(str(float(x)) for x in vector) + "]"

def validate_output(data):

    if data["primary_emotion"] not in EMOTIONS:
        data["primary_emotion"] = "calm"

    if data["secondary_emotion"] not in EMOTIONS:
        data["secondary_emotion"] = data["primary_emotion"]

    data["intensity"] = max(0, min(1, float(data["intensity"])))
    data["arousal"] = max(0, min(1, float(data["arousal"])))
    data["valence"] = max(-1, min(1, float(data["valence"])))

    valid_themes = [t for t in data["themes"] if t in THEMES]
    if len(valid_themes) == 0:
        valid_themes = ["growth"]

    data["themes"] = valid_themes[:3]

    return data

def build_row(transcript):
    analysis = analyze_transcript(transcript)
    analysis = validate_output(analysis)
    embedding = get_embedding(transcript)

    row = {
        "transcript": transcript,
        "summary": analysis["summary"],
        "primary_emotion": analysis["primary_emotion"],
        "secondary_emotion": analysis["secondary_emotion"],
        "intensity": analysis["intensity"],
        "valence": analysis["valence"],
        "arousal": analysis["arousal"],
        "themes": analysis["themes"],
        "embedding": embedding,
        "entry_date": datetime.now().date().isoformat(),
        "created_at": datetime.now().isoformat()
    }

    return row

if __name__ == "__main__":

    transcript = """
    Calm day reflecting on past month. Schoolwork done, focus on planning future tasks.
    """

    row = build_row(transcript)

    print(json.dumps(row, indent=2))