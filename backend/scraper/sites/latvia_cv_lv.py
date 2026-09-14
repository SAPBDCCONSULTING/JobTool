"""Latvia — cv.lv (CV-Online — search returns 500 / soft block under automation)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Latvia"
DOMAIN = "cv.lv"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(
        DOMAIN,
        "CV-Online search returns HTTP 500 / empty under automated browsers. Needs proxy or official API.",
    )
