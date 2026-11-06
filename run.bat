@echo off
cd /d %~dp0
cd frontend && call npm install && call npm run build && cd ..
cd backend
if not exist venv python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
