"""Business logic: daily progress calculation and notification triggers."""
from datetime import date, datetime, time, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from .models import Goal, Notification, Progress, Workout, WorkoutPlan

REMINDER_TITLE = "Time to move"
DEADLINE_TITLE = "Goal deadline approaching"
ALERT_STEPS = (50, 75, 100)


def goal_percent(goal: Goal) -> float:
    return round(min(100.0, goal.current_value / goal.target_value * 100), 1) if goal.target_value else 0.0


def recompute_progress(db: Session, user_id: int, day: date) -> Progress | None:
    """Recalculate the stored daily stats row for one user/day."""
    count, cals = db.query(func.count(Workout.id), func.coalesce(func.sum(Workout.calories_burned), 0)).filter(
        Workout.user_id == user_id, Workout.workout_date == day
    ).one()
    row = db.query(Progress).filter_by(user_id=user_id, date=day).first()
    if count == 0:
        if row:
            db.delete(row)
        return None
    if row is None:
        row = Progress(user_id=user_id, date=day)
        db.add(row)
    row.total_workouts, row.total_calories = int(count), int(cals)
    return row


def notify(db: Session, user_id: int, title: str, message: str) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message))


def _sent_today(db: Session, user_id: int, title: str, contains: str = "") -> bool:
    start = datetime.combine(date.today(), time.min)
    q = db.query(Notification.id).filter(
        Notification.user_id == user_id, Notification.title == title, Notification.created_at >= start
    )
    if contains:
        q = q.filter(Notification.message.contains(contains))
    return q.first() is not None


def run_triggers(db: Session, user_id: int) -> None:
    """Lazy triggers, evaluated whenever the user loads notifications (no scheduler needed)."""
    today = date.today()
    # 1) Daily workout reminder
    has_workout = db.query(Workout.id).filter_by(user_id=user_id, workout_date=today).first()
    if not has_workout and not _sent_today(db, user_id, REMINDER_TITLE):
        notify(db, user_id, REMINDER_TITLE, "You haven't logged a workout today. Even 15 minutes counts!")
    # 2) Goal deadline alerts (within 3 days)
    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "Active").all()
    for g in goals:
        left = (g.deadline - today).days
        tag = f"[#{g.id}]"
        if 0 <= left <= 3 and not _sent_today(db, user_id, DEADLINE_TITLE, tag):
            when = "today" if left == 0 else f"in {left} day{'s' if left != 1 else ''}"
            notify(db, user_id, DEADLINE_TITLE,
                   f"{tag} Your {g.goal_type} goal is due {when} and is {goal_percent(g):g}% complete.")
    # 3) Scheduled workout reminders (plans for today)
    for p in db.query(WorkoutPlan).filter_by(user_id=user_id, scheduled_date=today, is_completed=False):
        tag = f"[plan {p.id}]"
        if not _sent_today(db, user_id, "Workout scheduled today", tag):
            notify(db, user_id, "Workout scheduled today", f"{tag} Planned for today: {p.title}")
    db.commit()


def check_goal_alerts(db: Session, goal: Goal) -> None:
    """Goal progress alerts at 50 / 75 / 100 percent (sent once each)."""
    pct = goal_percent(goal)
    crossed = [s for s in ALERT_STEPS if pct >= s and s > goal.last_alert]
    if not crossed:
        return
    top = max(crossed)
    goal.last_alert = top
    if top == 100:
        notify(db, goal.user_id, "Goal reached!", f"You completed your {goal.goal_type} goal. Great work!")
    else:
        notify(db, goal.user_id, "Goal progress", f"You're {top}% of the way to your {goal.goal_type} goal.")


def summarize(db: Session, user_id: int, start: date, end: date) -> dict:
    """Per-day series, totals and category split for an inclusive date range."""
    rows = db.query(
        Workout.workout_date, func.count(Workout.id),
        func.coalesce(func.sum(Workout.calories_burned), 0), func.coalesce(func.sum(Workout.duration), 0),
    ).filter(Workout.user_id == user_id, Workout.workout_date.between(start, end)).group_by(Workout.workout_date).all()
    by_day = {r[0]: r for r in rows}
    days, d = [], start
    while d <= end:
        r = by_day.get(d)
        days.append({"date": d.isoformat(), "label": d.strftime("%a %d"),
                     "workouts": int(r[1]) if r else 0, "calories": int(r[2]) if r else 0,
                     "minutes": int(r[3]) if r else 0})
        d += timedelta(days=1)
    cats = db.query(
        Workout.category, func.count(Workout.id),
        func.coalesce(func.sum(Workout.calories_burned), 0), func.coalesce(func.sum(Workout.duration), 0),
    ).filter(Workout.user_id == user_id, Workout.workout_date.between(start, end)).group_by(Workout.category).all()
    total_w = sum(x["workouts"] for x in days)
    total_c = sum(x["calories"] for x in days)
    return {
        "start": start.isoformat(), "end": end.isoformat(), "days": days,
        "totals": {
            "workouts": total_w, "calories": total_c, "minutes": sum(x["minutes"] for x in days),
            "active_days": sum(1 for x in days if x["workouts"]),
            "avg_calories_per_workout": round(total_c / total_w) if total_w else 0,
        },
        "by_category": [{"category": c, "workouts": int(n), "calories": int(k), "minutes": int(m)} for c, n, k, m in cats],
    }
