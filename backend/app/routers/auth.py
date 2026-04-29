from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import RegisterIn, LoginIn, TokenOut, UserOut
from ..auth import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter()

def to_user_out(current_user: User) -> UserOut:
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

@router.post("/register", status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        nickname=payload.nickname.strip(),
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "registered"}

@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenOut(access_token=token)

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return to_user_out(current_user)

@router.post("/sync-trial", response_model=UserOut)
def sync_trial(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return to_user_out(current_user)
