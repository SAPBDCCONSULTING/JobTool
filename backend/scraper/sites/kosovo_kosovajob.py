"""Kosovo — kosovajob.com."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Kosovo"
DOMAIN = "kosovajob.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://www.kosovajob.com/?s={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(2)
    raw = await page.evaluate(
        """() => {
          const items=[], seen=new Set();
          document.querySelectorAll('.jobListCnts').forEach(card => {
            const titleEl=card.querySelector('.jobListTitle, a');
            const a=card.querySelector('a') || titleEl;
            if(!a) return;
            const href=a.href||'';
            const title=((titleEl&&titleEl.textContent)||a.textContent||'').trim().replace(/\\s+/g,' ');
            if(!href||title.length<8||seen.has(href)||/publiko|llogarit/i.test(href)) return;
            seen.add(href);
            const company=(card.querySelector('.jobListCompany,[class*="company" i]')||{}).textContent||'';
            items.push({title, href, company:(company||'Unknown').trim()});
          });
          return items.slice(0,100);
        }"""
    )
    return [job(i["title"], i["href"], i.get("company") or "Unknown") for i in raw]
