import re
from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Category = Literal["Cardio", "Strength", "Yoga"]
GoalType = Literal["Weight Loss", "Muscle Gain", "Steps"]
GoalStatus = Literal["Active", "Completed", "Cancelled"]


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", v):
            raise ValueError("use letters, numbers, dot, dash or underscore only")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class WorkoutBase(BaseModel):
    workout_name: str = Field(min_length=1, max_length=100)
    category: Category
    duration: int = Field(gt=0, le=1440, description="minutes")
    calories_burned: int = Field(ge=0, le=20000)
    workout_date: date


class WorkoutCreate(WorkoutBase):
    pass


class WorkoutUpdate(BaseModel):
    workout_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[Category] = None
    duration: Optional[int] = Field(default=None, gt=0, le=1440)
    calories_burned: Optional[int] = Field(default=None, ge=0, le=20000)
    workout_date: Optional[date] = None


class WorkoutOut(WorkoutBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime


class ProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    total_workouts: int
    total_calories: int


class DailySummary(BaseModel):
    date: date
    total_workouts: int
    total_calories: int
    total_minutes: int
    workouts: list[WorkoutOut]


class GoalCreate(BaseModel):
    goal_type: GoalType
    target_value: float = Field(gt=0, le=10_000_000)
    current_value: float = Field(default=0, ge=0, le=10_000_000)
    deadline: date


class GoalUpdate(BaseModel):
    goal_type: Optional[GoalType] = None
    target_value: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    current_value: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    deadline: Optional[date] = None
    status: Optional[GoalStatus] = None


class GoalProgress(BaseModel):
    current_value: float = Field(ge=0, le=10_000_000)


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    goal_type: GoalType
    target_value: float
    current_value: float
    deadline: date
    status: GoalStatus
    created_at: datetime
    progress_percent: float = 0
    days_left: int = 0


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime


# ---------------- Phase 2 ----------------
class PlanCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    scheduled_date: date


class PlanUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    scheduled_date: Optional[date] = None
    is_completed: Optional[bool] = None


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    description: str
    scheduled_date: date
    is_completed: bool
    created_at: datetime


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: Category
    description: str
    duration: int


class ExerciseLog(BaseModel):
    workout_date: Optional[date] = None
    duration: Optional[int] = Field(default=None, gt=0, le=1440)
    calories_burned: int = Field(ge=0, le=20000)


class ExerciseSchedule(BaseModel):
    scheduled_date: date


class StreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    last_workout_date: Optional[date]
    active_today: bool
    at_risk: bool


class BadgeOut(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    earned: bool = False
    earned_at: Optional[datetime] = None
