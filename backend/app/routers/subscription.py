from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import SubscriptionActivateIn, SubscriptionStatusOut

router = APIRouter()

@router.get("/status", response_model=SubscriptionStatusOut)
def get_status(current_user: User = Depends(get_current_user)):
    return SubscriptionStatusOut(
        subscription_active=current_user.subscription_active,
        subscription_expires_at=current_user.subscription_expires_at,
        free_queries_left=current_user.free_queries_left,
        trial_limit=current_user.trial_limit,
        free_queries_used=current_user.free_queries_used,
    )

@router.post("/activate", response_model=SubscriptionStatusOut)
def activate(payload: SubscriptionActivateIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.activate_subscription(days=30 if payload.plan == "monthly" else 365)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return SubscriptionStatusOut(
        subscription_active=current_user.subscription_active,
        subscription_expires_at=current_user.subscription_expires_at,
        free_queries_left=current_user.free_queries_left,
        trial_limit=current_user.trial_limit,
        free_queries_used=current_user.free_queries_used,
    )

@router.get("/checkout")
def checkout_url():
    return {"payment_url": "https://example.com/checkout/evoptima"}
