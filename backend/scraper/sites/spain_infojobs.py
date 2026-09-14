"""Spain — InfoJobs."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Spain"
DOMAIN = "infojobs.net"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 4):
        url = f"https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('[class*="ij-OfferCardContent"], [class*="OfferCard"]').forEach(card => {
                const a=card.querySelector('a[class*="title"], h2 a, h3 a');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                seen.add(href);
                const companyEl=card.querySelector('h3.ij-OfferCardContent-description-subtitle, [class*="subtitle" i], [id^="job-company"]');
                const company = companyEl ? (companyEl.textContent||'').trim() : '';
                const loc=(card.querySelector('[class*="location" i]')||{}).textContent||'';
                const dateEl=(card.querySelector('[class*="date" i]')||{}).textContent||'';
                items.push({title, href, company:(company||'Unknown').trim(), location:(loc||'').trim(), date:(dateEl||'').trim()});
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
