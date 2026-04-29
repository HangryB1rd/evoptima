from fastapi import APIRouter, Query
from ..seed import load_vehicle_catalog

router = APIRouter()
catalog = load_vehicle_catalog()

@router.get("/makes")
def get_makes(query: str = Query(default="")):
    makes = catalog["makes"]
    if query:
        q = query.lower().strip()
        makes = [item for item in makes if q in item.lower()]
    return {"items": makes}

@router.get("/models")
def get_models(make: str, query: str = Query(default="")):
    items = catalog["models_by_make"].get(make, [])
    if query:
        q = query.lower().strip()
        items = [item for item in items if q in item["model"].lower()]
    return {"items": items}
