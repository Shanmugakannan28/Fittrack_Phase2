# FitTrack – Fitness & Workout Management Platform

FastAPI + SQLAlchemy (SQLite) backend and React (Vite) frontend, served from **one host/port**.

## Run (single host)
Requires Python 3.10+ and Node 18+.

    ./run.sh        # Windows: run.bat

Builds the React app into `frontend/dist`, installs backend deps, and starts FastAPI on
**http://localhost:8000** (UI at `/`, API at `/api`, interactive docs at `/docs`).

Manual: `cd frontend && npm install && npm run build`, then
`cd backend && pip install -r requirements.txt && uvicorn app.main:app --port 8000`.

Dev mode (hot reload): run uvicorn on 8000, then `cd frontend && npm run dev` (http://localhost:5173, proxies /api).

## Modules
1. Auth – register/login, bcrypt hashing, JWT (token in localStorage), protected API + React routes
2. Workouts – add/edit/delete/list (+ category filter)
3. Daily progress – `progress` table recalculated on every workout change; `/api/progress/daily`
4. Goals – set, update progress, status (Active/Completed/Cancelled; auto-completes at 100%).
   Weight Loss / Muscle Gain values are "kg lost / kg gained so far"; Steps is a step count.
5. Reports – `/api/reports/weekly`, `/monthly`, `/calories` with Recharts charts
6. Notifications – daily reminder (no workout today), goal alerts at 50/75/100%, deadline within 3 days;
   evaluated when notifications load (no scheduler needed). Bell with unread badge + list page.

## Phase 2 modules
7. Plans – `/api/plans` CRUD + `/upcoming`; month calendar planner (plans, completed, logged workouts)
8. Exercise library – 23 seeded exercises, search + category filter, "Log workout" and "Schedule" actions
9. Progress comparison – `/api/compare/weekly|monthly`: series, % change vs previous period, trend, insights
10. Streaks – `/api/streak`; recomputed from workout dates (resets after a missed day, longest is kept)
11. Badges – 11 badges (workouts, streaks, goals, calories, variety); awarded automatically, popup on unlock
12. Personalized dashboard – `/api/dashboard` (daily summary, upcoming plans, goals, streak, badges)

Upgrading from Phase 1: just rebuild the frontend and restart; new tables are created automatically and your data is kept.

## Security
JWT (HS256, expiry configurable) · bcrypt · every query filtered by `user_id` (404 for others' records) ·
Pydantic validation on all input · secrets via `.env` (see `backend/.env.example`); if `SECRET_KEY` is unset a random key is generated into `backend/.secret_key`.
Set a fixed `SECRET_KEY` and restrict `CORS_ORIGINS` in production.

## Layout
    backend/app/{main,config,database,models,schemas,security,services}.py + routers/
    frontend/src/{App,auth,api}.* + pages/ + components/
