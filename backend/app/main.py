from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .db import Base, engine
from .routers import auth, profile, vehicles, faq, trips, subscription, chat, charging, rss

settings = get_settings()
Base.metadata.create_all(bind=engine)

Path('app/static/uploads').mkdir(parents=True, exist_ok=True)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://127.0.0.1:5500", "http://localhost:5500", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="app/static/uploads"), name="uploads")

@app.get("/api/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["vehicles"])
app.include_router(faq.router, prefix="/api/faq", tags=["faq"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(subscription.router, prefix="/api/subscription", tags=["subscription"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(charging.router, prefix="/api/charging", tags=["charging"])
app.include_router(rss.router, prefix="/rss", tags=["rss"])
