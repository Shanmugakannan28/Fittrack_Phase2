from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..database import get_db
from ..gamification import after_workout_change
from ..models import Exercise, User, Workout, WorkoutPlan
from ..schemas import Category, ExerciseLog, ExerciseOut, ExerciseSchedule, PlanOut, WorkoutOut
from ..security import get_current_user
from ..services import recompute_progress

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _get(db: Session, ex_id: int) -> Exercise:
    ex = db.get(Exercise, ex_id)
    if not ex:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
    return ex


@router.get("", response_model=list[ExerciseOut])
def list_exercises(q: Optional[str] = Query(None, max_length=60), category: Optional[Category] = None,
                   db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Exercise)
    if category:
        query = query.filter(Exercise.category == category)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Exercise.name.ilike(like), Exercise.description.ilike(like)))
    return query.order_by(Exercise.category, Exercise.name).all()


@router.get("/{ex_id}", response_model=ExerciseOut)
def get_exercise(ex_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get(db, ex_id)


@router.post("/{ex_id}/log", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def log_exercise(ex_id: int, data: ExerciseLog, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Add a library exercise to the user's workouts."""
    ex = _get(db, ex_id)
    w = Workout(user_id=user.id, workout_name=ex.name, category=ex.category, duration=data.duration or ex.duration,
                calories_burned=data.calories_burned, workout_date=data.workout_date or date.today())
    db.add(w)
    db.flush()
    recompute_progress(db, user.id, w.workout_date)
    after_workout_change(db, user.id)
    db.commit()
    db.refresh(w)
    return w


@router.post("/{ex_id}/schedule", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def schedule_exercise(ex_id: int, data: ExerciseSchedule, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    """Add a library exercise to the user's workout plan for a date."""
    ex = _get(db, ex_id)
    if data.scheduled_date < date.today():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Schedule workouts for today or a future date")
    p = WorkoutPlan(user_id=user.id, title=ex.name, scheduled_date=data.scheduled_date,
                    description=f"{ex.category} · {ex.duration} min. {ex.description}")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
