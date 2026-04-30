from fastapi import APIRouter, HTTPException, Response
from requests import RequestException

from ..services.rosavtodor_rss import get_road_situation_rss


router = APIRouter()


@router.get("/rosavtodor-road-situation.xml", response_class=Response)
def rosavtodor_road_situation_feed() -> Response:
    try:
        rss = get_road_situation_rss()
    except RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail="Failed to load Rosavtodor road situation page",
        ) from exc

    return Response(content=rss, media_type="application/rss+xml; charset=utf-8")
