"""Greece — kariera.gr (Cloudflare blocked)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Greece"
DOMAIN = "kariera.gr"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(
        DOMAIN,
        "Cloudflare 'Sorry, you have been blocked' (403). Needs residential proxy.",
    )
