from fastapi import APIRouter
from ..seed import load_faq

router = APIRouter()

@router.get("")
def get_faq():
    return {"items": load_faq()}
