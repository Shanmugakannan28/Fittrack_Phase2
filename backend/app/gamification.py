"""Streak tracking, achievement badges and seed data (exercise library + badge catalogue)."""
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session
from .models import Badge, Exercise, Goal, Streak, UserBadge, Workout
from .services import notify

# code, name, description, icon, metric, threshold
BADGES = [
    ("first_workout", "First Step", "Log your first workout", "👟", "workouts", 1),
    ("workouts_10", "Getting Going", "Complete 10 workouts", "💪", "workouts", 10),
    ("workouts_50", "Regular", "Complete 50 workouts", "🏅", "workouts", 50),
    ("workouts_100", "Centurion", "Complete 100 workouts", "🏆", "workouts", 100),
    ("streak_3", "Warming Up", "Work out 3 days in a row", "🔥", "streak", 3),
    ("streak_7", "Week Warrior", "Keep a 7-day streak", "⚡", "streak", 7),
    ("streak_30", "Unstoppable", "Keep a 30-day streak", "🌟", "streak", 30),
    ("goal_1", "Goal Getter", "Achieve your first goal", "🎯", "goals", 1),
    ("goal_3", "Goal Crusher", "Achieve 3 goals", "🚀", "goals", 3),
    ("cal_5000", "Calorie Crusher", "Burn 5,000 calories in total", "🍃", "calories", 5000),
    ("all_rounder", "All-Rounder", "Log Cardio, Strength and Yoga", "🧘", "categories", 3),
]

EXERCISES = [
    ("Running", "Cardio", "Steady-pace outdoor or treadmill run. Keep a pace where you can still talk.", 30),
    ("Jump Rope", "Cardio", "Skip with a light bounce on the balls of your feet. Great for coordination.", 15),
    ("Cycling", "Cardio", "Moderate-resistance ride, indoors or outdoors.", 45),
    ("Burpees", "Cardio", "Squat, kick back to plank, push-up, jump up. Repeat in sets of 10.", 10),
    ("High Knees", "Cardio", "Run in place driving knees to hip height with fast arms.", 10),
    ("Swimming", "Cardio", "Continuous laps at an easy to moderate effort. Low impact on joints.", 30),
    ("Brisk Walking", "Cardio", "Fast walk with swinging arms. A gentle start for beginners.", 40),
    ("Mountain Climbers", "Cardio", "From a plank, drive knees to chest alternately at speed.", 10),
    ("Push-ups", "Strength", "Hands under shoulders, body in a straight line, chest to just above floor.", 15),
    ("Squats", "Strength", "Feet shoulder-width, sit hips back and down, drive up through heels.", 15),
    ("Deadlifts", "Strength", "Hinge at the hips with a flat back and lift the bar to standing.", 25),
    ("Pull-ups", "Strength", "Hang from a bar and pull your chin above it with control.", 15),
    ("Lunges", "Strength", "Step forward and lower until both knees are at 90 degrees, then alternate.", 15),
    ("Plank", "Strength", "Hold a straight line from head to heels on forearms. Brace your core.", 10),
    ("Dumbbell Rows", "Strength", "Hinge forward and row a dumbbell to your hip, keeping your back flat.", 20),
    ("Bench Press", "Strength", "Lower the bar to mid-chest and press up. Use a spotter for heavy sets.", 25),
    ("Sun Salutation", "Yoga", "A flowing sequence linking breath with 12 poses. Ideal as a warm-up.", 15),
    ("Warrior Flow", "Yoga", "Warrior I, II and reverse warrior to build leg strength and balance.", 25),
    ("Child's Pose & Stretch", "Yoga", "Restful pose for the back and hips. Good for cool-downs.", 10),
    ("Downward Dog Hold", "Yoga", "Lengthen the spine and hamstrings while pressing the floor away.", 10),
    ("Vinyasa Flow", "Yoga", "A continuous, breath-led sequence of poses at a moderate pace.", 40),
    ("Yin Yoga", "Yoga", "Long, passive holds to release deep tissue and calm the mind.", 45),
    ("Tree Pose Balance", "Yoga", "Stand on one leg with the other foot on your calf or thigh. Focus on a point.", 10),
]


def seed(db: Session) -> None:
    existing = {c for (c,) in db.query(Badge.code)}
    for code, name, desc, icon, metric, th in BADGES:
        if code not in existing:
            db.add(Badge(code=code, name=name, description=desc, icon=icon, metric=metric, threshold=th))
    names = {n for (n,) in db.query(Exercise.name)}
    for name, cat, desc, dur in EXERCISES:
        if name not in names:
            db.add(Exercise(name=name, category=cat, description=desc, duration=dur))
    db.commit()


def refresh_streak(db: Session, user_id: int) -> Streak:
    """Recompute from workout dates so edits, deletes and missed days are all handled.
    A streak stays alive if you worked out today or yesterday; otherwise it resets to 0."""
    today = date.today()
    dates = sorted(d for (d,) in db.query(Workout.workout_date).filter(
        Workout.user_id == user_id, Workout.workout_date <= today).distinct())
    run, longest, prev = 0, 0, None
    for d in dates:
        run = run + 1 if prev and (d - prev).days == 1 else 1
        longest, prev = max(longest, run), d
    current = run if dates and (today - dates[-1]).days <= 1 else 0
    row = db.query(Streak).filter_by(user_id=user_id).first()
    if row is None:
        row = Streak(user_id=user_id, current_streak=0, longest_streak=0)
        db.add(row)
    row.current_streak = current
    row.longest_streak = max(row.longest_streak or 0, longest)  # achievements are never taken away
    row.last_workout_date = dates[-1] if dates else None
    return row


def _metrics(db: Session, user_id: int, streak: Streak) -> dict:
    count, cals = db.query(func.count(Workout.id), func.coalesce(func.sum(Workout.calories_burned), 0)).filter(
        Workout.user_id == user_id).one()
    cats = db.query(func.count(func.distinct(Workout.category))).filter(Workout.user_id == user_id).scalar()
    goals = db.query(func.count(Goal.id)).filter(Goal.user_id == user_id, Goal.status == "Completed").scalar()
    return {"workouts": count, "calories": cals, "categories": cats, "goals": goals,
            "streak": max(streak.longest_streak, streak.current_streak)}


def award_badges(db: Session, user_id: int) -> list[str]:
    db.flush()
    streak = refresh_streak(db, user_id)
    m = _metrics(db, user_id, streak)
    have = {b for (b,) in db.query(UserBadge.badge_id).filter_by(user_id=user_id)}
    new = []
    for b in db.query(Badge).all():
        if b.id not in have and m.get(b.metric, 0) >= b.threshold:
            db.add(UserBadge(user_id=user_id, badge_id=b.id))
            notify(db, user_id, "Badge earned!", f"{b.icon} {b.name}: {b.description}")
            new.append(b.name)
    return new


def after_workout_change(db: Session, user_id: int) -> list[str]:
    return award_badges(db, user_id)
