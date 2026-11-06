from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..gamification import refresh_streak
from ..models import Badge, User, UserBadge, Workout, WorkoutPlan, Goal
from ..schemas import PlanOut, WorkoutOut
from ..security import get_current_user
from ..services import goal_percent, recompute_progress, summarize
from .engagement import streak_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(on: Optional[date] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """One call that powers the personalized dashboard."""
    today = date.today()
    day = on or today
    row = recompute_progress(db, user.id, day)
    streak = refresh_streak(db, user.id)
    db.commit()

    workouts = db.query(Workout).filter(Workout.user_id == user.id, Workout.workout_date == day) \
        .order_by(Workout.id.desc()).all()
    upcoming = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == user.id, WorkoutPlan.scheduled_date >= today, WorkoutPlan.is_completed.is_(False)
    ).order_by(WorkoutPlan.scheduled_date, WorkoutPlan.id).limit(5).all()
    goals = db.query(Goal).filter(Goal.user_id == user.id, Goal.status == "Active").order_by(Goal.deadline).limit(4).all()
    recent = db.query(Badge, UserBadge).join(UserBadge, UserBadge.badge_id == Badge.id).filter(
        UserBadge.user_id == user.id).order_by(UserBadge.earned_at.desc()).limit(4).all()
    total_badges = db.query(Badge).count()
    earned = db.query(UserBadge).filter_by(user_id=user.id).count()

    return {
        "username": user.username,
        "date": day,
        "daily": {"total_workouts": row.total_workouts if row else 0,
                  "total_calories": row.total_calories if row else 0,
                  "total_minutes": sum(w.duration for w in workouts),
                  "workouts": [WorkoutOut.model_validate(w) for w in workouts]},
        "upcoming": [PlanOut.model_validate(p) for p in upcoming],
        "goals": [{"id": g.id, "goal_type": g.goal_type, "target_value": g.target_value,
                   "current_value": g.current_value, "deadline": g.deadline,
                   "progress_percent": goal_percent(g), "days_left": (g.deadline - today).days} for g in goals],
        "streak": streak_out(streak),
        "badges": {"earned": earned, "total": total_badges,
                   "recent": [{"name": b.name, "icon": b.icon, "description": b.description} for b, _ in recent]},
        "week": summarize(db, user.id, today - timedelta(days=6), today)["days"],
    }
