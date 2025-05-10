#!/bin/bash

# Get the absolute root path based on the script location
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# --- Start Frontend ---
echo "🔵 Starting Frontend..."
cd "$ROOT_DIR/client" && npm run dev &
sleep 2

# --- Start Backend ---
echo "🟢 Starting Backend..."
cd "$ROOT_DIR/server" && npm run dev &
sleep 2

# --- Start Python Emotion Service ---
echo "🟡 Starting Python Emotion Service..."
cd "$ROOT_DIR/emotion-service"
if [ -f "venv/Scripts/activate" ]; then
  . venv/Scripts/activate
  uvicorn app:app --port 5000
else
  echo "❌ Python venv not found! Please check the 'emotion-service/venv' directory."
fi
