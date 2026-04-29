from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import get_current_user
from ..models import Trip, User
from ..schemas import RoutePlanIn, RoutePlanOut, TripIn, TripOut
from ..services.route_planner import build_route_plan

router = APIRouter()

@router.get("", response_model=list[TripOut])
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.scalars(select(Trip).where(Trip.user_id == current_user.id).order_by(Trip.created_at.desc())).all()
    return list(items)

@router.post("", response_model=TripOut)
def create_trip(payload: TripIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.subscription_active and current_user.free_queries_left <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Free route builds are over. Subscription required."
        )

    trip = Trip(
        user_id=current_user.id,
        from_address=payload.from_address,
        to_address=payload.to_address,
        vehicle_make=payload.vehicle_make,
        vehicle_model=payload.vehicle_model,
        battery_percent=payload.battery_percent,
    )
    db.add(trip)

    if not current_user.subscription_active:
        current_user.free_queries_used += 1
        db.add(current_user)

    db.commit()
    db.refresh(trip)
    return trip

@router.post("/plan", response_model=RoutePlanOut)
def plan_trip(payload: RoutePlanIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.subscription_active and current_user.free_queries_left <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Free route builds are over. Subscription required."
        )

    if payload.save_trip:
        db.add(Trip(
            user_id=current_user.id,
            from_address=payload.from_address,
            to_address=payload.to_address,
            vehicle_make=payload.vehicle_make,
            vehicle_model=payload.vehicle_model,
            battery_percent=str(payload.current_battery_percent or payload.battery_percent or ""),
        ))

    if not current_user.subscription_active:
        current_user.free_queries_used += 1
        db.add(current_user)

    db.commit()
    db.refresh(current_user)
    return build_route_plan(payload, current_user.free_queries_left)
