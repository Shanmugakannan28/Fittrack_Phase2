from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, WorkoutPlan
from ..schemas import PlanCreate, PlanOut, PlanUpdate
from ..security import get_current_user

router = APIRouter(prefix="/plans", tags=["plans"])


def _owned(db: Session, user: User, pid: int) -> WorkoutPlan:
    p = db.query(WorkoutPlan).filter(WorkoutPlan.id == pid, WorkoutPlan.user_id == user.id).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    return p


@router.get("", response_model=list[PlanOut])
def list_plans(start: Optional[date] = None, end: Optional[date] = None, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    q = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == user.id)
    if start:
        q = q.filter(WorkoutPlan.scheduled_date >= start)
    if end:
        q = q.filter(WorkoutPlan.scheduled_date <= end)
    return q.order_by(WorkoutPlan.scheduled_date, WorkoutPlan.id).limit(500).all()


@router.get("/upcoming", response_model=list[PlanOut])
def upcoming(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    return db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == user.id, WorkoutPlan.scheduled_date >= date.today(),
        WorkoutPlan.is_completed.is_(False)).order_by(WorkoutPlan.scheduled_date, WorkoutPlan.id).limit(limit).all()


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.scheduled_date < date.today():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Schedule workouts for today or a future date")
    p = WorkoutPlan(user_id=user.id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/{pid}", response_model=PlanOut)
def update_plan(pid: int, data: PlanUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = _owned(db, user, pid)
    for k, v in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(pid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_owned(db, user, pid))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
