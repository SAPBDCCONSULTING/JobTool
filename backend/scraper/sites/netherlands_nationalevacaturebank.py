"""The Netherlands — Nationale Vacaturebank (bot / empty under automation)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "The Netherlands"
DOMAIN = "nationalevacaturebank.nl"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(
        DOMAIN,
        "Anti-bot protection blocks headless scrapers (empty/challenge page).",
    )
