from __future__ import annotations

from typing import Optional

import requests

from ..config import get_settings

settings = get_settings()

SYSTEM_PROMPT = (
    "Ты EVOptima AI - полезный ассистент для владельца электромобиля. "
    "Помогай строить маршрут, советуй зарядки, места поесть, туалеты, короткие остановки "
    "и практичные действия в дороге. Отвечай кратко, по делу, на русском, если пользователь пишет по-русски."
)


def build_fallback_reply(message: str, context: Optional[dict] = None) -> str:
    context = context or {}
    from_address = context.get("from_address") or "не указан"
    to_address = context.get("to_address") or "не указан"
    make = context.get("vehicle_make") or "не указана"
    model = context.get("vehicle_model") or "не указана"
    battery = context.get("battery_percent") or "не указан"
    msg = message.lower()

    if "поесть" in msg or "еда" in msg or "кафе" in msg:
        return (
            "По пути стоит искать сетевые кафе и АЗС-комплексы рядом с зарядками. "
            "Если скажете направление, я подскажу, где лучше совместить остановку и подзарядку."
        )
    if "туалет" in msg or "wc" in msg:
        return (
            "Для санитарной остановки лучше выбирать крупные ТЦ, сетевые АЗС и придорожные комплексы "
            "рядом с маршрутом. Могу подсказать удобные точки по пути."
        )
    if "заряд" in msg or "зарядк" in msg:
        return (
            "Сначала нужно оценить дистанцию, текущий заряд, расход и запас хода авто. "
            "После этого можно выбрать точки зарядки так, чтобы приезжать к ним с резервом 10-15%."
        )

    return (
        f"Понял запрос. Старт: {from_address}. Пункт назначения: {to_address}. "
        f"Автомобиль: {make} {model}. Заряд: {battery}%. "
        "Я могу помочь с маршрутом, зарядками, местами поесть, туалетами и удобными остановками по пути."
    )


def _parse_response_text(data: dict) -> str:
    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        return data["output_text"].strip()
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()
    return ""


def generate_ai_reply(message: str, context: Optional[dict] = None) -> str:
    context = context or {}
    if not settings.OPENAI_API_KEY:
        return build_fallback_reply(message, context)

    context_block = (
        f"Старт: {context.get('from_address') or 'не указан'}\n"
        f"Пункт назначения: {context.get('to_address') or 'не указан'}\n"
        f"Марка: {context.get('vehicle_make') or 'не указана'}\n"
        f"Модель: {context.get('vehicle_model') or 'не указана'}\n"
        f"Заряд: {context.get('battery_percent') or 'не указан'}%"
    )
    payload = {
        "model": settings.OPENAI_MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Контекст поездки:\n{context_block}\n\nЗапрос пользователя:\n{message}"},
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post("https://api.openai.com/v1/responses", json=payload, headers=headers, timeout=45)
        response.raise_for_status()
        text = _parse_response_text(response.json())
        return text or build_fallback_reply(message, context)
    except Exception:
        return build_fallback_reply(message, context)
