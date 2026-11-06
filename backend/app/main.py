from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from . import models  # noqa: F401  (register tables)
from .config import FRONTEND_DIST, settings
from .database import Base, engine
from . import gamification
from .database import SessionLocal
from .routers import (auth, compare, dashboard, engagement, exercises, goals, notifications, plans,
                      progress, reports, workouts)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # adds the new Phase 2 tables; existing data is untouched
    with SessionLocal() as db:
        gamification.seed(db)
    yield


app = FastAPI(title="FitTrack API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_methods=["*"], allow_headers=["*"],
)

api = APIRouter(prefix="/api")
for r in (auth, workouts, progress, goals, reports, notifications, plans, exercises, compare, dashboard):
    api.include_router(r.router)
api.include_router(engagement.streak_router)
api.include_router(engagement.badges_router)


@api.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


app.include_router(api)

# ---- Serve the built React app from the same host/port ----
if (FRONTEND_DIST / "index.html").exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not found")
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def no_frontend():
        return {"message": "Frontend not built yet. Run: cd frontend && npm install && npm run build. API docs at /docs"}
