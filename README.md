# EVOptima

EVOptima is an MVP for electric vehicle route planning. The project contains a static frontend and a FastAPI backend with authentication, profile data, trip history, vehicle catalog, route planning, charging station lookup, FAQ, subscription stub, and an AI chat endpoint.

## Project Structure

- `frontend/` - static UI served by Nginx in Docker. Main files: `index.html`, `login.html`, `register.html`, `styles.css`, `script.js`.
- `backend/` - FastAPI API, SQLite by default, JWT authentication, route planning services, and data files.
- `docker-compose.yml` - starts backend on port `8000` and frontend on port `5500`.

## Quick Start With Docker

Create `backend/.env` before starting the stack. The repository may already contain a local `.env`; keep secrets out of commits.

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:5500`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

If the browser shows an old UI after rebuilding, run:

```bash
docker compose down
docker compose build --no-cache
docker compose up
```

Then refresh the browser with `Ctrl+F5`.

## Backend Local Start

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On Linux/macOS, activate the virtual environment with:

```bash
source .venv/bin/activate
```

The API will be available at `http://127.0.0.1:8000`.

## Environment Variables

Backend settings are read from `backend/.env`.

```env
APP_NAME=EVOptima API
APP_ENV=development
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./evoptima.db
FRONTEND_ORIGIN=http://127.0.0.1:5500
YMAPS_API_KEY=
OPENCHARGEMAP_API_KEY=
OPENCHARGEMAP_USER_AGENT=EVOptima/1.0
OLLAMA_BASE_URL=http://localhost:11435
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_SECONDS=90
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Notes:

- `YMAPS_API_KEY` is used by backend geocoding for route planning.
- `OPENCHARGEMAP_API_KEY` is used for nearby charging stations and charging stops.
- If `OPENAI_API_KEY` is set, chat can use OpenAI. Otherwise the backend is prepared to use Ollama.
- `DATABASE_URL` defaults to SQLite for simple local launch.

## Main Features

- Registration, login, and JWT auth.
- User profile editing and avatar upload.
- Five free route planning requests for trial usage.
- Subscription status and checkout/activation stubs for MVP.
- Trip history and route saving.
- EV make/model catalog from `backend/app/data/vehicle_catalog.json`.
- Route planning with charging stops.
- Charging station lookup through Open Charge Map.
- FAQ API with RU/EN/DE frontend support.
- AI chat endpoint prepared for an LLM connection.
- Road situation RSS endpoint.

## Main API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/sync-trial`
- `GET /api/profile`
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
- `GET /api/subscription/checkout`
- `POST /api/chat/message`
- `GET /api/charging/nearby?lat=55.75&lon=37.61&distance_km=25`
- `GET /rss/rosavtodor-road-situation.xml`

## Route Planning

`POST /api/trips/plan` builds an EV route plan with charging stops. It uses:

- vehicle catalog WLTP range when make/model are known;
- provided `usable_battery_kwh` and `consumption_kwh_per_100km` when supplied;
- Yandex geocoding when addresses are passed without coordinates;
- Open Charge Map to find charging stations near calculated stop points.

Example request:

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

If the frontend already knows coordinates or route distance, pass `from_lat`, `from_lon`, `to_lat`, `to_lon`, or `route_distance_km` for a more stable calculation.

## Frontend Notes

The frontend is static and can be served by any HTTP server. In Docker it is served by Nginx at `http://localhost:5500`.

By default `script.js` builds the API base URL from the current host and port `8000`. The UI also stores an API base override in browser storage when needed.

## Recent Project Notes

The current rebuild keeps a single frontend and backend. Notable fixes from old notes:

- map layout and route panel were stabilized;
- profile opens directly without routing through the map;
- interface translations were expanded;
- vehicle make/model dropdown clipping was fixed;
- charging stations were visually separated;
- guest and profile trial limits were synchronized on login;
- route planning consumes the trial limit only when a route is built;
- trip history is scrollable;
- chat starts empty and is connected to the backend AI endpoint;
- route planning requires make, model, and charge data.
