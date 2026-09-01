"""Denmark — Jobindex."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Denmark"
DOMAIN = "jobindex.dk"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 9):
        url = f"https://www.jobindex.dk/jobsoegning?q={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              const skip=/^(se jobbet|jobsøgning|log ind)$/i;
              document.querySelectorAll('a[href*="/jobannonce/"]').forEach(a => {
                const href=a.href||'';
                let title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||seen.has(href)||skip.test(title)||title.length<8) return;
                seen.add(href);
                const card=a.closest('.PaidJob,[class*="PaidJob"]')||a.parentElement;
                const companyEl=card?card.querySelector('a[href*="/virksomhed/"]'):null;
                items.push({title, href, company: companyEl?companyEl.textContent.trim():'Unknown'});
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
