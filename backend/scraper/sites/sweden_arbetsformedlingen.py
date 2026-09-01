"""Sweden — Arbetsförmedlingen Platsbanken."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Sweden"
DOMAIN = "arbetsformedlingen.se"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 6):
        url = f"https://arbetsformedlingen.se/platsbanken/annonser?q={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('a[href*="/platsbanken/annonser/"], a[href*="/annonser/"]').forEach(a => {
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)||/kom igång|jobb du ska/i.test(title)) return;
                // require numeric/id-like path depth
                if(!/annonser\\/[a-z0-9-]+/i.test(href)) return;
                seen.add(href);
                const card=a.closest('article,li,div,section');
                const company=card?(card.querySelector('[class*="company" i],[class*="employer" i]')||{}).textContent||'':'';
                items.push({title, href, company:(company||'Unknown').trim()});
              });
              return items;
            }"""
        )
        if not raw:
            break
        new = 0
        for item in raw:
            if item["href"] in seen:
                continue
            seen.add(item["href"])
            all_jobs.append(job(item["title"], item["href"], item.get("company") or "Unknown"))
            new += 1
        if new == 0:
            break
    return all_jobs
