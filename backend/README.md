# EVOptima backend

## What is included
- registration and login
- JWT auth
- profile data and avatar upload
- 5 free AI requests counter
- subscription modal/payment stub
- trip history API
- FAQ API
- EV make/model catalog from the attached Excel file
- charging stations proxy via Open Charge Map
- basic chat endpoint prepared for future LLM connection

## Quick start
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API root will be available at `http://127.0.0.1:8000`

## Main endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/profile`
- `POST /api/profile/avatar`
- `GET /api/vehicles/makes`
- `GET /api/vehicles/models?make=Tesla&query=Model`
- `GET /api/faq`
- `GET /api/trips`
- `POST /api/trips`
- `POST /api/trips/plan`
- `GET /api/subscription/status`
- `POST /api/subscription/activate`
- `POST /api/chat/message`
- `GET /api/charging/nearby?lat=55.75&lon=37.61&distance_km=25`

## Notes
- registration redirects the user to login on the frontend
- the payment flow is a stub for MVP; replace the URL in `/api/subscription/checkout`
- by default the project uses SQLite for easy local launch

## Route planning
`POST /api/trips/plan` builds an EV route plan with charging stops. It uses:
- vehicle catalog WLTP range when make/model are known
- provided `usable_battery_kwh` and `consumption_kwh_per_100km` when supplied
- Yandex geocoding for addresses when coordinates are missing
- Open Charge Map to find charging stations near calculated stop points

Example body:
```json
{
  "from_address": "Moscow",
  "to_address": "Saint Petersburg",
  "vehicle_make": "Tesla",
  "vehicle_model": "Model 3 Long Range",
  "current_battery_percent": 72,
  "target_arrival_battery_percent": 15,
  "reserve_battery_percent": 10,
  "consumption_kwh_per_100km": 17.5,
  "usable_battery_kwh": 75,
  "save_trip": true
}
```

If frontend already knows coordinates or route distance, pass `from_lat`, `from_lon`, `to_lat`, `to_lon`, or `route_distance_km` for a more stable calculation.
