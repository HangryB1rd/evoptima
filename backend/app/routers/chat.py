from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..deps import get_optional_user
from ..models import ChatMessage, User
from ..schemas import ChatIn, ChatOut
from ..services.ai import generate_ai_reply

router = APIRouter()

@router.post("/message", response_model=ChatOut)
def send_message(payload: ChatIn, db: Session = Depends(get_db), current_user: User | None = Depends(get_optional_user)):
    if current_user:
        db.add(ChatMessage(user_id=current_user.id, role="user", content=payload.message))

    reply = generate_ai_reply(payload.message, payload.context)

    if current_user:
        db.add(ChatMessage(user_id=current_user.id, role="assistant", content=reply))
        db.commit()
        db.refresh(current_user)
        free_left = current_user.free_queries_left
    else:
        free_left = 5

    return ChatOut(reply=reply, free_queries_left=free_left, subscription_required=False)
