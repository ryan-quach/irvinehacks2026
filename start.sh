#!/bin/bash
# Start both backend (FastAPI) and frontend (Vite) for MindConstellation

ROOT="$(cd "$(dirname "$0")" && pwd)"
MIND="$ROOT/MindConstellation"

echo "Starting FastAPI backend on http://localhost:8000 ..."
cd "$MIND" && uvicorn backend.transcribe_server:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Vite frontend on http://localhost:5173 ..."
cd "$MIND" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both servers are running. Press Ctrl+C to stop."

# Kill both on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
