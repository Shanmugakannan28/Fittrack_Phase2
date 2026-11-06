import calendar
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workout
from ..security import get_current_user

router = APIRouter(prefix="/compare", tags=["compare"])
METRICS = ("workouts", "calories", "minutes")


def _totals(db: Session, uid: int, start: date, end: date) -> dict:
    n, c, m = db.query(func.count(Workout.id), func.coalesce(func.sum(Workout.calories_burned), 0),
                       func.coalesce(func.sum(Workout.duration), 0)).filter(
        Workout.user_id == uid, Workout.workout_date.between(start, end)).one()
    return {"workouts": int(n), "calories": int(c), "minutes": int(m)}


def _pct(cur: int, prev: int):
    return None if prev == 0 else round((cur - prev) / prev * 100)


def _build(db: Session, uid: int, periods: list, unit: str) -> dict:
    series = [{"label": lbl, "start": s.isoformat(), "end": e.isoformat(), **_totals(db, uid, s, e)}
              for s, e, lbl in periods]
    cur, prev = series[-1], series[-2]
    change = {k: _pct(cur[k], prev[k]) for k in METRICS}

    half = max(1, len(series) // 2)
    early = sum(p["calories"] for p in series[:-half]) / max(1, len(series) - half)
    late = sum(p["calories"] for p in series[-half:]) / half
    if early == 0 and late == 0:
        trend = "none"
    elif early == 0 or late >= early * 1.1:
        trend = "improving"
    elif late <= early * 0.9:
        trend = "declining"
    else:
        trend = "steady"

    insights = []
    if sum(p["workouts"] for p in series) == 0:
        insights.append("No workouts in this range yet. Log a few to see comparisons.")
    else:
        names = {"workouts": "workouts", "calories": "calories burned", "minutes": "active minutes"}
        for k in METRICS:
            if change[k] is None:
                if cur[k] > 0:
                    insights.append(f"Your {names[k]} are up from zero last {unit}. Great start!")
            elif change[k] > 0:
                insights.append(f"Your {names[k]} are up {change[k]}% compared with last {unit}.")
            elif change[k] < 0:
                insights.append(f"Your {names[k]} are down {abs(change[k])}% compared with last {unit}.")
            else:
                insights.append(f"Your {names[k]} match last {unit}.")
        best = max(series, key=lambda p: p["calories"])
        if best["calories"] > 0:
            insights.append(f"Best {unit} so far: {best['label']} with {best['calories']} kcal.")
        insights.append({"improving": "Overall trend: improving. Keep it up!",
                         "declining": "Overall trend: slowing down. A short workout today gets you back on track.",
                         "steady": "Overall trend: steady and consistent.", "none": ""}[trend])
        insights.append(f"The current {unit} is still in progress, so its numbers may rise.")
    return {"unit": unit, "series": series, "current": cur, "previous": prev, "change": change,
            "trend": trend, "insights": [i for i in insights if i]}


@router.get("/weekly")
def weekly(weeks: int = Query(8, ge=2, le=26), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    this_monday = date.today() - timedelta(days=date.today().weekday())
    periods = []
    for i in range(weeks - 1, -1, -1):
        s = this_monday - timedelta(weeks=i)
        periods.append((s, s + timedelta(days=6), s.strftime("%d %b")))
    return _build(db, user.id, periods, "week")


@router.get("/monthly")
def monthly(months: int = Query(6, ge=2, le=24), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = date.today()
    periods = []
    for i in range(months - 1, -1, -1):
        y, m = divmod(t.year * 12 + (t.month - 1) - i, 12)
        m += 1
        periods.append((date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1]), date(y, m, 1).strftime("%b %Y")))
    return _build(db, user.id, periods, "month")
