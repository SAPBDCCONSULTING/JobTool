"""Romania — eJobs."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Romania"
DOMAIN = "ejobs.ro"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 6):
        url = (
            f"https://www.ejobs.ro/locuri-de-munca/{q}"
            if page_num == 1
            else f"https://www.ejobs.ro/locuri-de-munca/{q}/pagina{page_num}.html"
        )
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('.job-card-wrapper, .job-card').forEach(card => {
                const a=card.querySelector('a[href*="/user/locuri-de-munca/"], a[href*="/locuri-de-munca/"], h2 a, h3 a');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                if(/\\/locuri-de-munca\\/(remote|entry-level|no-experience)\\//i.test(href)) return;
                seen.add(href);
                const company=(card.querySelector('[class*="company" i], a[href*="/company/"]')||{}).textContent||'';
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
