"""Montenegro — zaposli.me."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Montenegro"
DOMAIN = "zaposli.me"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://www.zaposli.me/?s={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(2)
    raw = await page.evaluate(
        """() => {
          const items=[], seen=new Set();
          document.querySelectorAll('.card.card-hover, .card').forEach(card => {
            const a=card.querySelector('a[href*="/oglas"], a[href*="/posao"], h2 a, h5 a, .card-title a');
            if(!a) return;
            const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
            if(!href||title.length<8||seen.has(href)||/objavite|svi poslovi/i.test(title)) return;
            seen.add(href);
            items.push({title, href, company:'Unknown'});
          });
          return items;
        }"""
    )
    return [job(i["title"], i["href"], i.get("company") or "Unknown") for i in raw]
