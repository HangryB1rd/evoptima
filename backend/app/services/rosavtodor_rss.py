from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import format_datetime
from html.parser import HTMLParser
from time import monotonic
from typing import Optional
from urllib.parse import urljoin
from xml.etree import ElementTree

import requests


BASE_URL = "https://rosavtodor.gov.ru"
ROAD_SITUATION_URL = (
    f"{BASE_URL}/about/upravlenie-fda/upravlenie-ekspluatacii-avtomobilnyh-dorog/"
    "situatsiya-na-dorogakh"
)
USER_AGENT = "EvoptimaRSS/1.0 (+https://rosavtodor.gov.ru)"
CACHE_TTL_SECONDS = 600

_cache: Optional[tuple[float, str]] = None


@dataclass
class RoadNewsItem:
    title: str
    link: str
    published_at: Optional[datetime]


class RoadSituationParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.items: list[RoadNewsItem] = []
        self._list_depth = 0
        self._current: Optional[dict[str, str | None]] = None
        self._capture: Optional[str] = None
        self._capture_chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())

        if tag == "div":
            if self._list_depth:
                self._list_depth += 1
            elif "list_items_news" in classes:
                self._list_depth = 1

        if self._list_depth and tag == "a" and "stLink-item" in classes:
            self._current = {"href": attr.get("href"), "title": None, "date": None}

        if self._current and tag == "p":
            if "dataText" in classes:
                self._start_capture("date")
            elif "text" in classes:
                self._start_capture("title")

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._capture_chunks.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "p" and self._capture and self._current is not None:
            self._current[self._capture] = " ".join("".join(self._capture_chunks).split())
            self._capture = None
            self._capture_chunks = []

        if tag == "a" and self._current is not None:
            title = (self._current.get("title") or "").strip()
            href = (self._current.get("href") or "").strip()
            if title and href:
                self.items.append(
                    RoadNewsItem(
                        title=title,
                        link=urljoin(BASE_URL, href),
                        published_at=parse_russian_date(self._current.get("date") or ""),
                    )
                )
            self._current = None

        if tag == "div" and self._list_depth:
            self._list_depth -= 1

    def _start_capture(self, field: str) -> None:
        self._capture = field
        self._capture_chunks = []


def get_road_situation_rss() -> str:
    global _cache

    now = monotonic()
    if _cache and now - _cache[0] < CACHE_TTL_SECONDS:
        return _cache[1]

    response = requests.get(
        ROAD_SITUATION_URL,
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    )
    response.raise_for_status()

    parser = RoadSituationParser()
    parser.feed(response.text)

    rss = build_rss(parser.items)
    _cache = (now, rss)
    return rss


def parse_russian_date(value: str) -> Optional[datetime]:
    parts = value.strip().lower().split()
    if len(parts) != 3:
        return None

    months = {
        "января": 1,
        "февраля": 2,
        "марта": 3,
        "апреля": 4,
        "мая": 5,
        "июня": 6,
        "июля": 7,
        "августа": 8,
        "сентября": 9,
        "октября": 10,
        "ноября": 11,
        "декабря": 12,
    }

    try:
        day = int(parts[0])
        month = months[parts[1]]
        year = int(parts[2])
    except (KeyError, ValueError):
        return None

    return datetime(year, month, day, tzinfo=timezone.utc)


def build_rss(items: list[RoadNewsItem]) -> str:
    rss = ElementTree.Element("rss", version="2.0")
    channel = ElementTree.SubElement(rss, "channel")
    ElementTree.SubElement(channel, "title").text = "Росавтодор: Ситуация на дорогах"
    ElementTree.SubElement(channel, "link").text = ROAD_SITUATION_URL
    ElementTree.SubElement(channel, "description").text = (
        "Новости раздела Росавтодора «Ситуация на дорогах»"
    )
    ElementTree.SubElement(channel, "language").text = "ru"
    ElementTree.SubElement(channel, "lastBuildDate").text = format_datetime(
        datetime.now(timezone.utc)
    )

    for news in items:
        item = ElementTree.SubElement(channel, "item")
        ElementTree.SubElement(item, "title").text = news.title
        ElementTree.SubElement(item, "link").text = news.link
        ElementTree.SubElement(item, "guid", isPermaLink="true").text = news.link
        ElementTree.SubElement(item, "description").text = news.title
        if news.published_at:
            ElementTree.SubElement(item, "pubDate").text = format_datetime(news.published_at)

    xml = ElementTree.tostring(rss, encoding="utf-8", xml_declaration=True)
    return xml.decode("utf-8")
