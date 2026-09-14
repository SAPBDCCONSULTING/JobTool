"""Norway — FINN.no jobs."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Norway"
DOMAIN = "finn.no"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 6):
        url = f"https://www.finn.no/job/fulltime/search.html?q={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('.job-card, article').forEach(card => {
                const a=card.querySelector('a[href*="/job/"], h2 a');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                seen.add(href);
                const logo=card.querySelector('img[alt]');
                let company = logo ? (logo.getAttribute('alt')||'') : '';
                company = company.replace(/ logo$/i,'').trim();
                const loc=(card.querySelector('[class*="location" i]')||{}).textContent||'';
                items.push({title, href, company:(company||'Unknown').trim(), location:(loc||'').trim()});
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
            all_jobs.append(job(item["title"], item["href"], item.get("company") or "Unknown", item.get("location") or ""))
            new += 1
        if new == 0:
            break
    return all_jobs
