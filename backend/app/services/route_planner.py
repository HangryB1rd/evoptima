from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any

import requests

from ..config import get_settings
from ..seed import load_vehicle_catalog
from ..schemas import ChargingStopOut, RouteCoordinate, RoutePlanIn, RoutePlanOut

settings = get_settings()

DEFAULT_CONSUMPTION_KWH_PER_100KM = 18.0
DEFAULT_USABLE_BATTERY_KWH = 60.0
ROAD_DISTANCE_FACTOR = 1.25
MAX_STOP_SEARCH_RADIUS_KM = 75
MAX_CORRIDOR_SEARCH_RADIUS_KM = 150
DEFAULT_CHARGER_POWER_KW = 50.0
MAX_ROUTE_GEOMETRY_POINTS = 1800
_charger_cache: dict[tuple[float, float, int, int], list[dict[str, Any]]] = {}


@dataclass
class Point:
    lat: float
    lon: float


def _extract_number(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"\d+(?:[,.]\d+)?", value)
    return float(match.group(0).replace(",", ".")) if match else None


def _connector_from_charge_type(value: str | None) -> str | None:
    if not value:
        return None
    lowered = value.lower()
    if "ccs 2" in lowered or "ccs2" in lowered:
        return "CCS 2"
    if "ccs" in lowered:
        return "CCS"
    if "chademo" in lowered:
        return "CHAdeMO"
    if "type 2" in lowered or "type2" in lowered:
        return "Type 2"
    return value.split("/")[0].strip() or None


def _vehicle_defaults(make: str | None, model: str | None) -> tuple[float, float, str | None, list[str]]:
    warnings: list[str] = []
    usable_battery_kwh = DEFAULT_USABLE_BATTERY_KWH
    consumption = DEFAULT_CONSUMPTION_KWH_PER_100KM
    vehicle_connector = None

    if not make or not model:
        warnings.append("Не указана модель авто, использованы средние значения: 60 кВт*ч и 18 кВт*ч/100 км.")
        return usable_battery_kwh, consumption, vehicle_connector, warnings

    catalog = load_vehicle_catalog()
    models = catalog.get("models_by_make", {}).get(make, [])
    selected = next((item for item in models if item.get("model") == model), None)
    if not selected:
        warnings.append("Модель не найдена в каталоге, использованы средние значения расхода и батареи.")
        return usable_battery_kwh, consumption, vehicle_connector, warnings

    vehicle_connector = _connector_from_charge_type(selected.get("charge_type"))
    range_km = _extract_number(selected.get("range_wltp"))
    if range_km:
        practical_range_km = range_km * 0.85
        usable_battery_kwh = max(35.0, round(practical_range_km * consumption / 100, 1))
    else:
        warnings.append("Для модели нет запаса хода WLTP, использованы средние значения батареи.")

    return usable_battery_kwh, consumption, vehicle_connector, warnings


def _geocode(address: str) -> tuple[Point | None, str | None]:
    if not settings.YMAPS_API_KEY:
        return None, "YMAPS_API_KEY не настроен, адреса нельзя автоматически превратить в координаты."
    try:
        response = requests.get(
            "https://geocode-maps.yandex.ru/1.x/",
            params={"apikey": settings.YMAPS_API_KEY, "geocode": address, "format": "json", "results": 1},
            timeout=15,
        )
        response.raise_for_status()
        members = response.json().get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])
        if not members:
            return None, f"Не удалось найти координаты для адреса: {address}"
        lon, lat = [float(part) for part in members[0]["GeoObject"]["Point"]["pos"].split()]
        return Point(lat=lat, lon=lon), None
    except Exception:
        return None, f"Не удалось геокодировать адрес: {address}"


def _haversine_km(a: Point, b: Point) -> float:
    radius = 6371.0
    lat1 = math.radians(a.lat)
    lat2 = math.radians(b.lat)
    dlat = math.radians(b.lat - a.lat)
    dlon = math.radians(b.lon - a.lon)
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(value))


def _interpolate(a: Point, b: Point, fraction: float) -> Point:
    fraction = max(0.0, min(1.0, fraction))
    return Point(lat=a.lat + (b.lat - a.lat) * fraction, lon=a.lon + (b.lon - a.lon) * fraction)


def _max_power_kw(connections: list[dict[str, Any]]) -> float | None:
    values = []
    for connection in connections:
        power = connection.get("PowerKW")
        if isinstance(power, (int, float)) and power > 0:
            values.append(float(power))
    return max(values) if values else None


def _normalize_charger(item: dict[str, Any]) -> dict[str, Any]:
    address = item.get("AddressInfo") or {}
    connections = item.get("Connections") or []
    return {
        "id": item.get("ID"),
        "title": address.get("Title"),
        "address": address.get("AddressLine1"),
        "town": address.get("Town"),
        "lat": address.get("Latitude"),
        "lon": address.get("Longitude"),
        "distance_km": address.get("Distance"),
        "connections_count": len(connections),
        "connection_types": [c.get("ConnectionType", {}).get("Title") for c in connections if c.get("ConnectionType")],
        "power_kw": _max_power_kw(connections),
        "status": (item.get("StatusType") or {}).get("Title"),
    }


def _connector_matches(charger: dict[str, Any], connector: str | None) -> bool:
    if not connector:
        return False
    target = connector.lower().replace(" ", "")
    if target == "ccs2":
        accepted = {"ccs2", "type2combo", "ccstype2", "combinedchargingsystem"}
    elif target == "ccs":
        accepted = {"ccs", "ccs2", "type2combo", "ccstype2", "combinedchargingsystem"}
    else:
        accepted = {target}
    normalized_types = [str(item).lower().replace(" ", "").replace("-", "") for item in charger.get("connection_types", [])]
    return any(any(variant in item for variant in accepted) for item in normalized_types)


def _sort_chargers(chargers: list[dict[str, Any]], preferred_connector: str | None) -> list[dict[str, Any]]:
    def score(charger: dict[str, Any]) -> tuple[float, float, float]:
        connector_penalty = 0 if _connector_matches(charger, preferred_connector) else 100
        status = str(charger.get("status") or "").lower()
        status_penalty = 0 if "operational" in status or "available" in status or "работ" in status else 15
        power_bonus = -min(float(charger.get("power_kw") or 0), 250.0) / 25
        return (connector_penalty + status_penalty + power_bonus, float(charger.get("distance_km") or 9999), -float(charger.get("connections_count") or 0))

    compatible = [charger for charger in chargers if _connector_matches(charger, preferred_connector)]
    if compatible:
        return sorted(compatible, key=score)
    return sorted(chargers, key=score)


def _find_chargers(point: Point, radius_km: int, max_results: int) -> list[dict[str, Any]]:
    if not settings.OPENCHARGEMAP_API_KEY:
        return []
    cache_key = (round(point.lat, 3), round(point.lon, 3), radius_km, max_results)
    if cache_key in _charger_cache:
        return _charger_cache[cache_key]
    response = requests.get(
        "https://api.openchargemap.io/v3/poi",
        headers={"X-API-Key": settings.OPENCHARGEMAP_API_KEY, "User-Agent": settings.OPENCHARGEMAP_USER_AGENT},
        params={
            "output": "json",
            "latitude": point.lat,
            "longitude": point.lon,
            "distance": radius_km,
            "distanceunit": "KM",
            "maxresults": max_results,
            "compact": "true",
            "verbose": "false",
        },
        timeout=6,
    )
    response.raise_for_status()
    items = [_normalize_charger(item) for item in response.json()]
    _charger_cache[cache_key] = items
    return items


def _search_stop_chargers(
    point: Point,
    max_results: int,
    warnings: list[str],
    preferred_connector: str | None,
) -> tuple[list[dict[str, Any]], int]:
    if not settings.OPENCHARGEMAP_API_KEY:
        warnings.append("OPENCHARGEMAP_API_KEY не настроен, остановки рассчитаны без конкретных станций.")
        return [], 0
    for radius in (10, 20, 35, 50, MAX_STOP_SEARCH_RADIUS_KM):
        try:
            chargers = _find_chargers(point, radius, max(max_results * 3, 12))
        except Exception:
            warnings.append("Open Charge Map временно не ответил, конкретные зарядки не подтянуты.")
            return [], radius
        if chargers:
            return _sort_chargers(chargers, preferred_connector)[:max_results], radius
    warnings.append("Рядом с одной из расчетных точек не найдено зарядок в радиусе 75 км.")
    return [], MAX_STOP_SEARCH_RADIUS_KM


def _charge_minutes(charge_kwh: float, power_kw: float | None) -> int | None:
    effective_power = power_kw or DEFAULT_CHARGER_POWER_KW
    if effective_power <= 0 or charge_kwh <= 0:
        return None
    # Real charging slows near high SOC, so add a 20% practical buffer.
    return max(1, math.ceil(charge_kwh / effective_power * 60 * 1.2))


def _thin_geometry(coordinates: list[list[float]]) -> list[list[float]]:
    if len(coordinates) <= MAX_ROUTE_GEOMETRY_POINTS:
        return coordinates
    step = math.ceil(len(coordinates) / MAX_ROUTE_GEOMETRY_POINTS)
    thinned = coordinates[::step]
    if thinned[-1] != coordinates[-1]:
        thinned.append(coordinates[-1])
    return thinned


def _search_route_corridor_chargers(
    from_point: Point | None,
    to_point: Point | None,
    total_distance_km: float,
    target_distance_km: float,
    min_distance_km: float,
    max_distance_km: float,
    max_results: int,
    warnings: list[str],
    preferred_connector: str | None,
) -> tuple[list[dict[str, Any]], int, float]:
    if not from_point or not to_point or total_distance_km <= 0:
        return [], 0, target_distance_km

    lower = max(0.0, min_distance_km)
    upper = min(total_distance_km, max_distance_km)
    if upper < lower:
        upper = lower

    window = max(25.0, upper - lower)
    offsets = [0, -window * 0.35, window * 0.35]
    distances: list[float] = []
    for offset in offsets:
        value = min(upper, max(lower, target_distance_km + offset))
        if all(abs(value - item) > 1 for item in distances):
            distances.append(value)
    for value in (lower, upper, (lower + upper) / 2):
        if all(abs(value - item) > 1 for item in distances):
            distances.append(value)

    best_items: list[dict[str, Any]] = []
    best_radius = 0
    best_distance = target_distance_km
    best_score = float("inf")

    for distance in distances:
        point = _interpolate(from_point, to_point, distance / total_distance_km)
        for radius in (50, MAX_CORRIDOR_SEARCH_RADIUS_KM):
            try:
                chargers = _find_chargers(point, radius, max(max_results * 3, 12))
            except Exception:
                warnings.append("Open Charge Map временно не ответил, конкретные зарядки не подтянуты.")
                return [], radius, target_distance_km
            if not chargers:
                continue
            ranked = _sort_chargers(chargers, preferred_connector)
            top = ranked[0]
            station_offset = float(top.get("distance_km") or radius)
            route_offset = abs(distance - target_distance_km)
            connector_penalty = 0 if _connector_matches(top, preferred_connector) else 60
            score = route_offset * 1.1 + station_offset * 2.5 + connector_penalty
            if score < best_score:
                best_score = score
                best_items = ranked[:max_results]
                best_radius = radius
                best_distance = distance
            break

    if best_items:
        if abs(best_distance - target_distance_km) > 10:
            warnings.append(
                f"Зарядка подобрана примерно на {round(best_distance)} км маршрута, потому что в расчётной точке станций не было."
            )
        return best_items, best_radius, best_distance

    warnings.append("Не удалось найти подходящую зарядку по коридору маршрута даже при расширенном поиске.")
    return [], MAX_CORRIDOR_SEARCH_RADIUS_KM, target_distance_km


def _build_osrm_geometry(points: list[Point], warnings: list[str]) -> tuple[list[RouteCoordinate], str | None]:
    usable_points = [point for point in points if point is not None]
    if len(usable_points) < 2:
        return [], None
    coords = ";".join(f"{point.lon:.6f},{point.lat:.6f}" for point in usable_points)
    try:
        response = requests.get(
            f"https://router.project-osrm.org/route/v1/driving/{coords}",
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
            timeout=8,
        )
        response.raise_for_status()
        routes = response.json().get("routes") or []
        if not routes:
            warnings.append("OSRM не вернул дорожную геометрию маршрута.")
            return [], None
        coordinates = _thin_geometry(routes[0].get("geometry", {}).get("coordinates") or [])
        geometry = [RouteCoordinate(lat=float(lat), lon=float(lon)) for lon, lat in coordinates]
        return geometry, "osrm"
    except Exception:
        warnings.append("Не удалось получить дорожную линию маршрута через OSRM.")
        return [], None


def build_route_plan(payload: RoutePlanIn, free_queries_left: int) -> RoutePlanOut:
    warnings: list[str] = []
    usable_battery_kwh, consumption, vehicle_connector, vehicle_warnings = _vehicle_defaults(payload.vehicle_make, payload.vehicle_model)
    warnings.extend(vehicle_warnings)

    if payload.usable_battery_kwh:
        usable_battery_kwh = payload.usable_battery_kwh
    if payload.consumption_kwh_per_100km:
        consumption = payload.consumption_kwh_per_100km

    preferred_connector = payload.preferred_connector or vehicle_connector
    current_battery = payload.current_battery_percent
    if current_battery is None:
        current_battery = _extract_number(payload.battery_percent)
    if current_battery is None:
        current_battery = 80.0
        warnings.append("Текущий заряд не указан, для расчета принято 80%.")

    from_point = Point(payload.from_lat, payload.from_lon) if payload.from_lat is not None and payload.from_lon is not None else None
    to_point = Point(payload.to_lat, payload.to_lon) if payload.to_lat is not None and payload.to_lon is not None else None
    if not from_point:
        from_point, warning = _geocode(payload.from_address)
        if warning:
            warnings.append(warning)
    if not to_point:
        to_point, warning = _geocode(payload.to_address)
        if warning:
            warnings.append(warning)

    if payload.route_distance_km:
        estimated_distance_km = payload.route_distance_km
    elif from_point and to_point:
        estimated_distance_km = round(_haversine_km(from_point, to_point) * ROAD_DISTANCE_FACTOR, 1)
    else:
        estimated_distance_km = 0.0
        warnings.append("Нет координат или route_distance_km, поэтому невозможно точно оценить длину маршрута.")

    energy_needed = round(estimated_distance_km * consumption / 100, 1)
    available_energy = usable_battery_kwh * current_battery / 100
    target_arrival_energy = usable_battery_kwh * payload.target_arrival_battery_percent / 100
    reserve_energy = usable_battery_kwh * payload.reserve_battery_percent / 100
    arrival_without_charging = round(current_battery - (energy_needed / usable_battery_kwh * 100), 1)
    charging_required = available_energy - energy_needed < target_arrival_energy

    stops: list[ChargingStopOut] = []
    distance_done = 0.0
    battery_now = current_battery
    max_iterations = 8

    while charging_required and estimated_distance_km > 0 and len(stops) < max_iterations:
        remaining_distance = estimated_distance_km - distance_done
        energy_to_finish = remaining_distance * consumption / 100
        if usable_battery_kwh * battery_now / 100 - energy_to_finish >= target_arrival_energy:
            break

        reachable_km = max(0.0, ((battery_now / 100 * usable_battery_kwh) - reserve_energy) / consumption * 100)
        if reachable_km <= 5:
            stop_distance = distance_done
            warnings.append("Текущий заряд ниже резерва: сначала ищем ближайшую зарядку около старта, до дальней точки ехать нельзя.")
        else:
            stop_distance = min(estimated_distance_km, distance_done + max(5.0, reachable_km * 0.82))

        leg_km = max(0.0, stop_distance - distance_done)
        battery_on_arrival = round(battery_now - (leg_km * consumption / usable_battery_kwh), 1)
        reachable = battery_on_arrival >= 0

        search_point = _interpolate(from_point, to_point, stop_distance / estimated_distance_km) if from_point and to_point else None
        chargers: list[dict[str, Any]] = []
        search_radius = 0
        if search_point:
            max_search_distance = min(estimated_distance_km, distance_done + max(0.0, reachable_km * 0.92))
            min_search_distance = distance_done if reachable_km <= 5 else min(estimated_distance_km, distance_done + 5)
            chargers, search_radius, stop_distance = _search_route_corridor_chargers(
                from_point,
                to_point,
                estimated_distance_km,
                stop_distance,
                min_search_distance,
                max_search_distance,
                payload.max_results_per_stop,
                warnings,
                preferred_connector,
            )
            leg_km = max(0.0, stop_distance - distance_done)
            battery_on_arrival = round(battery_now - (leg_km * consumption / usable_battery_kwh), 1)
            reachable = battery_on_arrival >= 0
            search_point = _interpolate(from_point, to_point, stop_distance / estimated_distance_km)

        remaining_after_stop = max(0.0, estimated_distance_km - stop_distance)
        needed_after_stop_percent = (remaining_after_stop * consumption / 100 + target_arrival_energy) / usable_battery_kwh * 100
        charge_to = min(90.0, max(60.0, round(needed_after_stop_percent + payload.reserve_battery_percent, 1)))
        charge_kwh = round(max(0.0, (charge_to - max(0.0, battery_on_arrival)) / 100 * usable_battery_kwh), 1)

        if not chargers:
            warnings.append("Маршрут не может быть построен безопасно: на достижимом участке не найдено зарядных станций.")
            break

        best = chargers[0]
        power_kw = best.get("power_kw")
        stops.append(
            ChargingStopOut(
                order=len(stops) + 1,
                title=best.get("title"),
                address=best.get("address"),
                town=best.get("town"),
                lat=best.get("lat") if best else (search_point.lat if search_point else None),
                lon=best.get("lon") if best else (search_point.lon if search_point else None),
                distance_from_start_km=round(stop_distance, 1),
                search_radius_km=search_radius,
                battery_on_arrival_percent=battery_on_arrival,
                recommended_charge_to_percent=charge_to,
                estimated_charge_kwh=charge_kwh,
                estimated_charge_minutes=_charge_minutes(charge_kwh, power_kw),
                charger_power_kw=power_kw,
                connector_match=_connector_matches(best, preferred_connector),
                vehicle_connector=preferred_connector,
                reachable_with_current_charge=reachable,
                status=best.get("status"),
                connections_count=best.get("connections_count", 0),
                connection_types=best.get("connection_types", []),
                alternatives=chargers[1:],
            )
        )

        if stop_distance <= distance_done and battery_now >= charge_to:
            warnings.append("Не удалось продвинуть маршрут: проверьте стартовый заряд или задайте ближайшую зарядку вручную.")
            break
        distance_done = stop_distance
        battery_now = charge_to

    if len(stops) >= max_iterations:
        warnings.append("Маршрут требует слишком много зарядных остановок для текущих параметров. Проверьте расход, батарею и дистанцию.")

    if charging_required:
        summary = f"Нужна зарядка: расчетная дистанция {estimated_distance_km} км, остановок: {len(stops)}."
    else:
        summary = f"Зарядка по пути не нужна: расчетный остаток на финише около {arrival_without_charging}%."

    geometry_points: list[Point] = []
    if from_point:
        geometry_points.append(from_point)
    for stop in stops:
        if stop.lat is not None and stop.lon is not None:
            geometry_points.append(Point(lat=stop.lat, lon=stop.lon))
    if to_point:
        geometry_points.append(to_point)
    route_geometry, route_geometry_source = _build_osrm_geometry(geometry_points, warnings)

    return RoutePlanOut(
        summary=summary,
        from_point=RouteCoordinate(lat=from_point.lat, lon=from_point.lon) if from_point else None,
        to_point=RouteCoordinate(lat=to_point.lat, lon=to_point.lon) if to_point else None,
        estimated_distance_km=estimated_distance_km,
        estimated_consumption_kwh_per_100km=consumption,
        usable_battery_kwh=usable_battery_kwh,
        current_battery_percent=current_battery,
        target_arrival_battery_percent=payload.target_arrival_battery_percent,
        estimated_energy_needed_kwh=energy_needed,
        estimated_arrival_battery_without_charging_percent=arrival_without_charging,
        charging_required=charging_required,
        stops=stops,
        route_geometry=route_geometry,
        route_geometry_source=route_geometry_source,
        warnings=list(dict.fromkeys(warnings)),
        free_queries_left=free_queries_left,
    )
