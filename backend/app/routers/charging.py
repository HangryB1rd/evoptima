from fastapi import APIRouter, Depends, HTTPException, Query
import requests
from ..config import get_settings

router = APIRouter()
settings = get_settings()

@router.get("/nearby")
def nearby(lat: float = Query(...), lon: float = Query(...), distance_km: int = Query(default=25, ge=1, le=150), max_results: int = Query(default=30, ge=1, le=100)):
    if not settings.OPENCHARGEMAP_API_KEY:
        raise HTTPException(status_code=500, detail="OPENCHARGEMAP_API_KEY is not configured")

    url = "https://api.openchargemap.io/v3/poi"
    headers = {
        "X-API-Key": settings.OPENCHARGEMAP_API_KEY,
        "User-Agent": settings.OPENCHARGEMAP_USER_AGENT,
    }
    params = {
        "output": "json",
        "latitude": lat,
        "longitude": lon,
        "distance": distance_km,
        "distanceunit": "KM",
        "maxresults": max_results,
        "compact": "true",
        "verbose": "false",
    }
    response = requests.get(url, params=params, headers=headers, timeout=20)
    response.raise_for_status()
    raw_items = response.json()
    items = []
    for item in raw_items:
        address = item.get("AddressInfo") or {}
        connections = item.get("Connections") or []
        items.append({
            "id": item.get("ID"),
            "title": address.get("Title"),
            "address": address.get("AddressLine1"),
            "town": address.get("Town"),
            "lat": address.get("Latitude"),
            "lon": address.get("Longitude"),
            "distance_km": address.get("Distance"),
            "connections_count": len(connections),
            "connection_types": [c.get("ConnectionType", {}).get("Title") for c in connections if c.get("ConnectionType")],
            "status": (item.get("StatusType") or {}).get("Title"),
        })
    return {"items": items}
