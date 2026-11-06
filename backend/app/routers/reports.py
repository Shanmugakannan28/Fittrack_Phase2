import calendar
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..security import get_current_user
from ..services import summarize

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/weekly")
def weekly(end: Optional[date] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Seven days ending on `end` (default today), compared with the 7 days before."""
    end = end or date.today()
    start = end - timedelta(days=6)
    data = summarize(db, user.id, start, end)
    prev = summarize(db, user.id, start - timedelta(days=7), start - timedelta(days=1))
    data["previous"] = prev["totals"]
    return data


@router.get("/monthly")
def monthly(year: Optional[int] = Query(None, ge=2000, le=2100), month: Optional[int] = Query(None, ge=1, le=12),
            db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    year, month = year or today.year, month or today.month
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    data = summarize(db, user.id, start, end)
    py, pm = (year - 1, 12) if month == 1 else (year, month - 1)
    prev = summarize(db, user.id, date(py, pm, 1), date(py, pm, calendar.monthrange(py, pm)[1]))
    data["previous"] = prev["totals"]
    weeks = {}
    for d in data["days"]:
        wk = (int(d["date"][8:]) - 1) // 7 + 1
        w = weeks.setdefault(wk, {"week": f"Week {wk}", "workouts": 0, "calories": 0, "minutes": 0})
        for k in ("workouts", "calories", "minutes"):
            w[k] += d[k]
    data["weeks"] = list(weeks.values())
    data["year"], data["month"] = year, month
    return data


@router.get("/calories")
def calories(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    end = date.today()
    data = summarize(db, user.id, end - timedelta(days=days - 1), end)
    series = [{"date": d["date"], "label": d["label"], "calories": d["calories"]} for d in data["days"]]
    total = data["totals"]["calories"]
    return {"days": days, "series": series, "total": total, "daily_average": round(total / days),
            "best_day": max(series, key=lambda s: s["calories"]) if total else None}
