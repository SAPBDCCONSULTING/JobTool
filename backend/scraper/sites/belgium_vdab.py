"""Belgium — VDAB (vdab.be).

Vacancy search redirects to login:
  https://www-login.vdab.be/login/start?...
with Itsme / eID and Friendly Captcha — not scrapable without authenticated session.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Belgium"
DOMAIN = "vdab.be"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    # Navigate once so logs show the login wall, then fail clearly.
    try:
        await page.goto(
            f"https://www.vdab.be/vindeenjob/vacatures?trefwoord={keyword.strip()}",
            wait_until="domcontentloaded",
            timeout=30000,
        )
    except Exception:
        pass

    raise BotBlockedError(
        DOMAIN,
        "VDAB requires job-seeker login (www-login.vdab.be) + Friendly Captcha. "
        "Public vacancy scraping is not available without an authenticated session.",
    )
