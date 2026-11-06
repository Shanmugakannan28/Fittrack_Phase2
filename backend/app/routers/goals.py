from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Goal, User
from ..schemas import GoalCreate, GoalOut, GoalProgress, GoalUpdate
from ..security import get_current_user
from ..gamification import award_badges
from ..services import check_goal_alerts, goal_percent

router = APIRouter(prefix="/goals", tags=["goals"])


def _out(g: Goal) -> GoalOut:
    out = GoalOut.model_validate(g)
    out.progress_percent = goal_percent(g)
    out.days_left = (g.deadline - date.today()).days
    return out


def _owned(db: Session, user: User, goal_id: int) -> Goal:
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not g:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")
    return g


def _sync_status(db: Session, g: Goal) -> None:
    if g.status == "Active" and g.current_value >= g.target_value:
        g.status = "Completed"
    check_goal_alerts(db, g)
    award_badges(db, g.user_id)


@router.get("", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goals = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.deadline).all()
    return [_out(g) for g in goals]


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def set_goal(data: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.deadline < date.today():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Deadline cannot be in the past")
    g = Goal(user_id=user.id, **data.model_dump())
    db.add(g)
    db.flush()
    _sync_status(db, g)
    db.commit()
    db.refresh(g)
    return _out(g)


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, data: GoalUpdate, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    g = _owned(db, user, goal_id)
    for k, v in data.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(g, k, v)
    _sync_status(db, g)
    db.commit()
    db.refresh(g)
    return _out(g)


@router.patch("/{goal_id}/progress", response_model=GoalOut)
def track_progress(goal_id: int, data: GoalProgress, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    g = _owned(db, user, goal_id)
    g.current_value = data.current_value
    _sync_status(db, g)
    db.commit()
    db.refresh(g)
    return _out(g)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_owned(db, user, goal_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
