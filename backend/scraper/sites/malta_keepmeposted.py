"""Malta — keepmeposted.com.mt (Cloudflare 403)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Malta"
DOMAIN = "keepmeposted.com.mt"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(DOMAIN, "Cloudflare Access Denied (403) blocks automated scraping.")
