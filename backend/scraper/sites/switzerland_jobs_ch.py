"""Switzerland — jobs.ch."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Switzerland"
DOMAIN = "jobs.ch"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://www.jobs.ch/en/vacancies/?term={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(3)
    raw = await page.evaluate(
        """() => {
          const items=[], seen=new Set();
          document.querySelectorAll('a[href*="/vacancies/detail/"], a[href*="/stelle/"]').forEach(a => {
            const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
            if(!href.includes('jobs.ch')||title.length<8||seen.has(href)||/navigation|explore companies|salary/i.test(title)) return;
            seen.add(href);
            const card=a.closest('article,li,div');
            const company=card?(card.querySelector('[class*="company" i]')||{}).textContent||'':'';
            items.push({title, href, company:(company||'Unknown').trim()});
          });
          return items;
        }"""
    )
    return [job(i["title"], i["href"], i.get("company") or "Unknown") for i in raw]
