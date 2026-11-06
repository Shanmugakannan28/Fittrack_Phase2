from datetime import date, timedelta
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..gamification import refresh_streak
from ..models import Badge, User, UserBadge
from ..schemas import BadgeOut, StreakOut
from ..security import get_current_user

streak_router = APIRouter(prefix="/streak", tags=["streak"])
badges_router = APIRouter(prefix="/badges", tags=["badges"])


def streak_out(s) -> StreakOut:
    today = date.today()
    active_today = s.last_workout_date == today
    return StreakOut(current_streak=s.current_streak, longest_streak=s.longest_streak,
                     last_workout_date=s.last_workout_date, active_today=active_today,
                     at_risk=s.current_streak > 0 and s.last_workout_date == today - timedelta(days=1))


@streak_router.get("", response_model=StreakOut)
def get_streak(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = refresh_streak(db, user.id)  # resets the streak if a day was missed
    db.commit()
    return streak_out(s)


def _badge(b: Badge, ub: UserBadge | None) -> BadgeOut:
    return BadgeOut(id=b.id, code=b.code, name=b.name, description=b.description, icon=b.icon,
                    earned=ub is not None, earned_at=ub.earned_at if ub else None)


@badges_router.get("", response_model=list[BadgeOut])
def list_badges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mine = {ub.badge_id: ub for ub in db.query(UserBadge).filter_by(user_id=user.id)}
    return [_badge(b, mine.get(b.id)) for b in db.query(Badge).order_by(Badge.id)]


@badges_router.get("/unseen", response_model=list[BadgeOut])
def unseen(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(UserBadge, Badge).join(Badge, Badge.id == UserBadge.badge_id).filter(
        UserBadge.user_id == user.id, UserBadge.seen.is_(False)).all()
    return [_badge(b, ub) for ub, b in rows]


@badges_router.post("/seen", status_code=status.HTTP_204_NO_CONTENT)
def mark_seen(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(UserBadge).filter_by(user_id=user.id, seen=False).update({"seen": True})
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
