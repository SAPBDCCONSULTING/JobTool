"""Ukraine — robota.ua (bot protection under automation)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Ukraine"
DOMAIN = "robota.ua"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(DOMAIN, "Anti-bot protection blocks automated scraping.")
