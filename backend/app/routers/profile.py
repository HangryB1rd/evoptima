import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import ProfileUpdateIn, UserOut

router = APIRouter()

@router.get("", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        free_queries_used=current_user.free_queries_used,
        free_queries_left=current_user.free_queries_left,
        trial_limit=current_user.trial_limit,
        subscription_active=current_user.subscription_active,
        subscription_expires_at=current_user.subscription_expires_at,
    )

@router.put("", response_model=UserOut)
def update_profile(payload: ProfileUpdateIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.nickname:
        current_user.nickname = payload.nickname.strip()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        free_queries_used=current_user.free_queries_used,
        free_queries_left=current_user.free_queries_left,
        trial_limit=current_user.trial_limit,
        subscription_active=current_user.subscription_active,
        subscription_expires_at=current_user.subscription_expires_at,
    )

@router.post("/avatar")
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    destination = os.path.join("app", "static", "uploads", filename)
    with open(destination, "wb") as f:
        f.write(file.file.read())
    current_user.avatar_url = f"/uploads/{filename}"
    db.add(current_user)
    db.commit()
    return {"avatar_url": current_user.avatar_url}
