from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Notification, User
from ..schemas import NotificationOut
from ..security import get_current_user
from ..services import run_triggers

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _owned(db: Session, user: User, nid: int) -> Notification:
    n = db.query(Notification).filter(Notification.id == nid, Notification.user_id == user.id).first()
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return n


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run_triggers(db, user.id)
    return db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc(),
                                                                       Notification.id.desc()).limit(100).all()


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    run_triggers(db, user.id)
    return {"count": db.query(Notification).filter_by(user_id=user.id, is_read=False).count()}


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def read_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{nid}/read", response_model=NotificationOut)
def mark_read(nid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = _owned(db, user, nid)
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n


@router.delete("/{nid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(nid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_owned(db, user, nid))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
