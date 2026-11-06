from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workout
from ..schemas import Category, WorkoutCreate, WorkoutOut, WorkoutUpdate
from ..security import get_current_user
from ..gamification import after_workout_change
from ..services import recompute_progress

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _owned(db: Session, user: User, workout_id: int) -> Workout:
    w = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == user.id).first()
    if not w:  # 404 (not 403) so other users' ids are not revealed
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workout not found")
    return w


@router.get("", response_model=list[WorkoutOut])
def list_workouts(
    category: Optional[Category] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Workout).filter(Workout.user_id == user.id)
    if category:
        q = q.filter(Workout.category == category)
    if start:
        q = q.filter(Workout.workout_date >= start)
    if end:
        q = q.filter(Workout.workout_date <= end)
    return q.order_by(Workout.workout_date.desc(), Workout.id.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def add_workout(data: WorkoutCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    w = Workout(user_id=user.id, **data.model_dump())
    db.add(w)
    db.flush()
    recompute_progress(db, user.id, w.workout_date)
    after_workout_change(db, user.id)
    db.commit()
    db.refresh(w)
    return w


@router.get("/{workout_id}", response_model=WorkoutOut)
def get_workout(workout_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _owned(db, user, workout_id)


@router.put("/{workout_id}", response_model=WorkoutOut)
def edit_workout(workout_id: int, data: WorkoutUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    w = _owned(db, user, workout_id)
    old_date = w.workout_date
    for k, v in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(w, k, v)
    db.flush()
    recompute_progress(db, user.id, old_date)
    if w.workout_date != old_date:
        recompute_progress(db, user.id, w.workout_date)
    after_workout_change(db, user.id)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(workout_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    w = _owned(db, user, workout_id)
    day = w.workout_date
    db.delete(w)
    db.flush()
    recompute_progress(db, user.id, day)
    after_workout_change(db, user.id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
