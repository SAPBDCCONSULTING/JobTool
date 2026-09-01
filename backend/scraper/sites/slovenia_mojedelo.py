"""Slovenia — mojedelo.com."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._harvest import harvest_links, q

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Slovenia"
DOMAIN = "mojedelo.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    return await harvest_links(
        page,
        f"https://www.mojedelo.com/prosta-delovna-mesta?q={q(keyword)}",
        href_includes="mojedelo.com",
        href_regex=r"/delo/|/job/",
    )
