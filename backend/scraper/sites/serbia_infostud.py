"""Serbia — Infostud Poslovi."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Serbia"
DOMAIN = "infostud.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://poslovi.infostud.com/oglasi-za-posao?q={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(3)
    raw = await page.evaluate(
        """() => {
          const items=[], seen=new Set();
          document.querySelectorAll('a[href*="infostud.com"]').forEach(a => {
            const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
            if(title.length<10||seen.has(href)||/pretraga|email|navigat/i.test(title)) return;
            if(!/\\/(posao|oglas)\\//i.test(href) && !/oglasi\\/\\d+/i.test(href)) return;
            seen.add(href);
            items.push({title, href, company:'Unknown'});
          });
          return items.slice(0,80);
        }"""
    )
    return [job(i["title"], i["href"], i.get("company") or "Unknown") for i in raw]
