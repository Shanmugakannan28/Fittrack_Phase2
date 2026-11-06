from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Progress, User, Workout
from ..schemas import DailySummary, ProgressOut
from ..security import get_current_user
from ..services import recompute_progress

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/daily", response_model=DailySummary)
def daily(on: Optional[date] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    day = on or date.today()
    row = recompute_progress(db, user.id, day)
    db.commit()
    workouts = db.query(Workout).filter(Workout.user_id == user.id, Workout.workout_date == day) \
        .order_by(Workout.id.desc()).all()
    return DailySummary(
        date=day,
        total_workouts=row.total_workouts if row else 0,
        total_calories=row.total_calories if row else 0,
        total_minutes=sum(w.duration for w in workouts),
        workouts=workouts,
    )


@router.get("/history", response_model=list[ProgressOut])
def history(days: int = Query(14, ge=1, le=365), db: Session = Depends(get_db),
            user: User = Depends(get_current_user)):
    since = date.today() - timedelta(days=days - 1)
    return db.query(Progress).filter(Progress.user_id == user.id, Progress.date >= since) \
        .order_by(Progress.date).all()
