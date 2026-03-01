# make sure to have url and keys in .env file for this to work

import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
from journal_processor import build_row

_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(_env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(f"Supabase credentials not found. Tried loading from: {_env_path}")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def submit_journal_entry(transcript: str):
    # 1. Run analysis + chunking
    journal_entry, theme_rows = build_row(transcript)


    # 2. Insert journal entry, get back the id
    res = supabase.table("journal_entries").insert(journal_entry).execute()
    journal_id = res.data[0]["id"]

    # 3. Attach journal_id and created_at to each theme row and insert
    now_iso = datetime.now().isoformat()
    for row in theme_rows:
        row["journal_id"] = journal_id
        row["created_at"] = now_iso

    if theme_rows:
        supabase.table("theme_embeddings").insert(theme_rows).execute()

    # print(f"Entry {journal_id} inserted with {len(theme_rows)} theme chunks")
    return journal_id


if __name__ == "__main__":
    transcript = """
    Had a rough morning at work, my manager gave me a ton of feedback that felt unfair. I went to the gym after and did a heavy leg day which honestly helped clear my head. Been thinking about whether I should start looking for a new job. On the bright side, my girlfriend and I had a really good conversation tonight about our future together.
    """

    entry_id = submit_journal_entry(transcript)
    print(f"Entry ID: {entry_id}")