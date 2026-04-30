from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(min_length=2, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    nickname: str
    avatar_url: str | None = None
    free_queries_used: int
    free_queries_left: int
    trial_limit: int
    subscription_active: bool
    subscription_expires_at: datetime | None = None

    class Config:
        from_attributes = True

class ProfileUpdateIn(BaseModel):
    nickname: str | None = Field(default=None, min_length=2, max_length=80)

class TripIn(BaseModel):
    from_address: str
    to_address: str
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    battery_percent: str | None = None

class TripOut(TripIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatIn(BaseModel):
    message: str
    context: dict | None = None

class ChatOut(BaseModel):
    reply: str
    free_queries_left: int
    subscription_required: bool = False

class RoutePlanIn(TripIn):
    from_lat: float | None = None
    from_lon: float | None = None
    to_lat: float | None = None
    to_lon: float | None = None
    route_distance_km: float | None = Field(default=None, gt=0)
    current_battery_percent: float | None = Field(default=None, ge=0, le=100)
    target_arrival_battery_percent: float = Field(default=15, ge=0, le=80)
    reserve_battery_percent: float = Field(default=10, ge=0, le=50)
    consumption_kwh_per_100km: float | None = Field(default=None, gt=0, le=60)
    usable_battery_kwh: float | None = Field(default=None, gt=0, le=250)
    preferred_connector: str | None = None
    max_results_per_stop: int = Field(default=5, ge=1, le=10)
    save_trip: bool = True

class RouteCoordinate(BaseModel):
    lat: float
    lon: float

class ChargingStopOut(BaseModel):
    order: int
    title: str | None = None
    address: str | None = None
    town: str | None = None
    lat: float | None = None
    lon: float | None = None
    distance_from_start_km: float
    search_radius_km: int
    battery_on_arrival_percent: float
    recommended_charge_to_percent: float
    estimated_charge_kwh: float
    estimated_charge_minutes: int | None = None
    charger_power_kw: float | None = None
    connector_match: bool = False
    vehicle_connector: str | None = None
    reachable_with_current_charge: bool = True
    status: str | None = None
    connections_count: int = 0
    connection_types: list[str] = []
    alternatives: list[dict] = []

class RoutePlanOut(BaseModel):
    summary: str
    from_point: RouteCoordinate | None = None
    to_point: RouteCoordinate | None = None
    estimated_distance_km: float
    estimated_consumption_kwh_per_100km: float
    usable_battery_kwh: float
    current_battery_percent: float
    target_arrival_battery_percent: float
    estimated_energy_needed_kwh: float
    estimated_arrival_battery_without_charging_percent: float
    estimated_drive_minutes: int | None = None
    estimated_charging_minutes: int = 0
    estimated_trip_minutes: int | None = None
    charging_required: bool
    stops: list[ChargingStopOut]
    route_geometry: list[RouteCoordinate] = []
    route_geometry_source: str | None = None
    warnings: list[str] = []
    free_queries_left: int
    subscription_required: bool = False

class SubscriptionActivateIn(BaseModel):
    plan: str = "monthly"

class SubscriptionStatusOut(BaseModel):
    subscription_active: bool
    subscription_expires_at: datetime | None = None
    free_queries_left: int
    trial_limit: int
    free_queries_used: int

class FAQItem(BaseModel):
    question: str
    answer: str

class VehicleModelOut(BaseModel):
    model: str
    charge_type: str | None = None
    range_wltp: str | None = None
