"""Italy — InfoJobs.it (platform closed)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Italy"
DOMAIN = "infojobs.it"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    raise BotBlockedError(
        DOMAIN,
        "InfoJobs.it is officially closed ('piattaforma ufficialmente chiusa'). No public job listings.",
    )
