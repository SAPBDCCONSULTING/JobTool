"""United Kingdom — Reed."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "United Kingdom"
DOMAIN = "reed.co.uk"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    slug = keyword.strip().replace(" ", "-")
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 6):
        url = f"https://www.reed.co.uk/jobs/{slug}-jobs?pageno={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('article[data-qa="job-card"], article').forEach(card => {
                const a=card.querySelector('h2 a, h3 a, a[data-qa="job-card-title"]');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                seen.add(href);
                const company=(card.querySelector('[data-qa="job-card-company"], [class*="company" i]')||{}).textContent||'';
                const loc=(card.querySelector('[data-qa="job-card-location"], [class*="location" i]')||{}).textContent||'';
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
            all_jobs.append(
                job(item["title"], item["href"], item.get("company") or "Unknown", item.get("location") or "")
            )
            new += 1
        if new == 0:
            break
    return all_jobs
