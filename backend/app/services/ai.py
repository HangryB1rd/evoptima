from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse, urlunparse

import requests

from ..config import get_settings

settings = get_settings()

SYSTEM_PROMPT = (
    "Ты EVOptima AI - полезный ассистент для владельца электромобиля. "
    "Помогай строить маршрут, советуй зарядки, места поесть, туалеты, короткие остановки "
    "и практичные действия в дороге. Отвечай кратко, по делу, на языке пользователя."
)


def build_fallback_reply(message: str, context: Optional[dict] = None) -> str:
    context = context or {}
    from_address = context.get("from_address") or "не указан"
    to_address = context.get("to_address") or "не указан"
    make = context.get("vehicle_make") or "не указана"
    model = context.get("vehicle_model") or "не указана"
    battery = context.get("battery_percent") or "не указан"
    msg = message.lower()

    if any(word in msg for word in ("поесть", "еда", "кафе")):
        return (
            "По пути стоит искать сетевые кафе, ТЦ и АЗС-комплексы рядом с зарядками. "
            "Если укажете направление, я подскажу, где лучше совместить остановку и подзарядку."
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


def _trip_context_block(context: dict) -> str:
    return (
        f"Старт: {context.get('from_address') or 'не указан'}\n"
        f"Пункт назначения: {context.get('to_address') or 'не указан'}\n"
        f"Марка: {context.get('vehicle_make') or 'не указана'}\n"
        f"Модель: {context.get('vehicle_model') or 'не указана'}\n"
        f"Заряд: {context.get('battery_percent') or 'не указан'}%"
    )


def _format_context_value(value) -> str:
    if value is None or value == "":
        return "unknown"
    if isinstance(value, float):
        return f"{value:.1f}".rstrip("0").rstrip(".")
    return str(value)


def _point_text(point: dict | None) -> str:
    if not isinstance(point, dict):
        return "unknown"
    lat = point.get("lat")
    lon = point.get("lon")
    if lat is None or lon is None:
        return "unknown"
    return f"{lat}, {lon}"


def _route_plan_context_block(context: dict) -> str:
    plan = context.get("route_plan")
    if not isinstance(plan, dict) or not plan.get("built"):
        return "Route plan: not built yet."

    lines = [
        "Route plan from EVOptima planner:",
        f"- Summary: {_format_context_value(plan.get('summary'))}",
        f"- From point: {_point_text(plan.get('from_point'))}",
        f"- To point: {_point_text(plan.get('to_point'))}",
        f"- Distance: {_format_context_value(plan.get('estimated_distance_km'))} km",
        f"- Consumption: {_format_context_value(plan.get('estimated_consumption_kwh_per_100km'))} kWh/100 km",
        f"- Usable battery: {_format_context_value(plan.get('usable_battery_kwh'))} kWh",
        f"- Current battery: {_format_context_value(plan.get('current_battery_percent'))}%",
        f"- Target arrival battery: {_format_context_value(plan.get('target_arrival_battery_percent'))}%",
        f"- Energy needed: {_format_context_value(plan.get('estimated_energy_needed_kwh'))} kWh",
        f"- Arrival battery without charging: {_format_context_value(plan.get('estimated_arrival_battery_without_charging_percent'))}%",
        f"- Drive time: {_format_context_value(plan.get('estimated_drive_minutes'))} min",
        f"- Charging time: {_format_context_value(plan.get('estimated_charging_minutes'))} min",
        f"- Total trip time: {_format_context_value(plan.get('estimated_trip_minutes'))} min",
        f"- Charging required: {'yes' if plan.get('charging_required') else 'no'}",
        f"- Stops count: {_format_context_value(plan.get('stops_count'))}",
    ]

    stops = plan.get("stops")
    if isinstance(stops, list) and stops:
        lines.append("Charging stops:")
        for stop in stops[:8]:
            if not isinstance(stop, dict):
                continue
            title = stop.get("title") or f"Stop {stop.get('order') or '?'}"
            address = ", ".join(str(part) for part in [stop.get("address"), stop.get("town")] if part)
            lines.extend([
                f"- Stop {stop.get('order') or '?'}: {title}",
                f"  Address: {_format_context_value(address)}",
                f"  Point: {_point_text(stop.get('point'))}",
                f"  Distance from start: {_format_context_value(stop.get('distance_from_start_km'))} km",
                f"  Battery on arrival: {_format_context_value(stop.get('battery_on_arrival_percent'))}%",
                f"  Charge to: {_format_context_value(stop.get('recommended_charge_to_percent'))}%",
                f"  Energy to add: {_format_context_value(stop.get('estimated_charge_kwh'))} kWh",
                f"  Charging time: {_format_context_value(stop.get('estimated_charge_minutes'))} min",
                f"  Charger power: {_format_context_value(stop.get('charger_power_kw'))} kW",
                f"  Vehicle connector: {_format_context_value(stop.get('vehicle_connector'))}",
                f"  Connector match: {'yes' if stop.get('connector_match') else 'no'}",
                f"  Reachable now: {'yes' if stop.get('reachable_with_current_charge') else 'no'}",
                f"  Status: {_format_context_value(stop.get('status'))}",
            ])
            connection_types = stop.get("connection_types")
            if isinstance(connection_types, list) and connection_types:
                lines.append(f"  Connection types: {', '.join(str(item) for item in connection_types)}")
            alternatives = stop.get("alternatives")
            if isinstance(alternatives, list) and alternatives:
                alt_titles = [
                    str(item.get("title") or item.get("address") or "alternative")
                    for item in alternatives
                    if isinstance(item, dict)
                ]
                if alt_titles:
                    lines.append(f"  Alternatives nearby: {', '.join(alt_titles[:3])}")

    warnings = plan.get("warnings")
    if isinstance(warnings, list) and warnings:
        lines.append("Route warnings:")
        lines.extend(f"- {item}" for item in warnings[:8] if item)

    geometry_count = plan.get("route_geometry_points_count")
    if geometry_count:
        lines.append(f"Route geometry points count: {geometry_count}")
    geometry_sample = plan.get("route_geometry_sample")
    if isinstance(geometry_sample, list) and geometry_sample:
        sample = "; ".join(_point_text(point) for point in geometry_sample if isinstance(point, dict))
        if sample:
            lines.append(f"Route geometry sample: {sample}")

    return "\n".join(lines)


def _full_context_block(context: dict) -> str:
    return f"{_trip_context_block(context)}\n\n{_route_plan_context_block(context)}"


def _parse_openai_response_text(data: dict) -> str:
    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        return data["output_text"].strip()
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()
    return ""


def _ollama_generate(message: str, context: dict) -> str:
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Контекст поездки:\n{_full_context_block(context)}\n\n"
                    f"Запрос пользователя:\n{message}\n\n"
                    "Ответь как EVOptima AI: дай конкретный, короткий совет."
                ),
            },
        ],
        "stream": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 450,
        },
    }
    last_error: Exception | None = None
    for base_url in _ollama_base_urls():
        try:
            response = requests.post(
                f"{base_url}/api/chat",
                json=payload,
                timeout=settings.OLLAMA_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()
            message_data = data.get("message") if isinstance(data.get("message"), dict) else {}
            text = message_data.get("content")
            return text.strip() if isinstance(text, str) else ""
        except Exception as exc:
            last_error = exc
    if last_error:
        raise last_error
    return ""


def _ollama_base_urls() -> list[str]:
    configured = settings.OLLAMA_BASE_URL.rstrip("/")
    urls = [configured] if configured else []
    parsed = urlparse(configured)
    if parsed.hostname in {"localhost", "127.0.0.1"}:
        host_url = urlunparse(parsed._replace(netloc=f"host.docker.internal:{parsed.port or 11434}")).rstrip("/")
        if host_url not in urls:
            urls.append(host_url)
    return urls


def _openai_generate(message: str, context: dict) -> str:
    payload = {
        "model": settings.OPENAI_MODEL,
        "input": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Контекст поездки:\n{_full_context_block(context)}\n\n"
                    f"Запрос пользователя:\n{message}"
                ),
            },
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    response = requests.post("https://api.openai.com/v1/responses", json=payload, headers=headers, timeout=45)
    response.raise_for_status()
    return _parse_openai_response_text(response.json())


def generate_ai_reply(message: str, context: Optional[dict] = None) -> str:
    context = context or {}

    if settings.OLLAMA_BASE_URL and settings.OLLAMA_MODEL:
        try:
            text = _ollama_generate(message, context)
            if text:
                return text
        except Exception:
            pass

    if settings.OPENAI_API_KEY:
        try:
            text = _openai_generate(message, context)
            if text:
                return text
        except Exception:
            pass

    return build_fallback_reply(message, context)
