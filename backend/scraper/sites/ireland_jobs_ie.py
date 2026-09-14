"""Ireland — jobs.ie (CDN Access Denied)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Ireland"
DOMAIN = "jobs.ie"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(DOMAIN, "CDN Access Denied (403) blocks automated scraping.")
