#!/usr/bin/env bash
# Builds the React app, then serves frontend + API together at http://localhost:8000
set -e
cd "$(dirname "$0")"
(cd frontend && npm install && npm run build)
cd backend
[ -d venv ] || python3 -m venv venv
. venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
