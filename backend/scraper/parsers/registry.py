"""Compatibility layer: prefer per-site scrapers in ../sites/, keep generic fallback helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING
from urllib.parse import urlparse

from sites import get_site_scraper
from sites._base import BotBlockedError

if TYPE_CHECKING:
    from typing import Awaitable, Callable

    from playwright.async_api import Page

    ParserFn = Callable[[Page, str], Awaitable[list[dict]]]


def get_parser(website_url: str) -> "ParserFn | None":
    """Return the dedicated country/website scraper if one exists."""
    scraper = get_site_scraper(website_url)
    if scraper:
        return scraper
    return None


# Re-export for scrape.py
__all__ = ["get_parser", "BotBlockedError"]
