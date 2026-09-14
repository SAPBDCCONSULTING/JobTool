"""Czech Republic — jobs.cz."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Czech Republic"
DOMAIN = "jobs.cz"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 6):
        url = f"https://www.jobs.cz/prace/?q[]={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('.SearchResultCard, article').forEach(card => {
                const a=card.querySelector('a.SearchResultCard__titleLink, a[href*="/rpd/"], h2 a');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                seen.add(href);
                const logo = card.querySelector('[class*="logo" i] img[alt], .SearchResultCard__logo img, .CompanyLogo img');
                let company = logo ? (logo.getAttribute('alt')||'').trim() : '';
                // Footer items: first = company, second = location
                const footer = [...card.querySelectorAll('.SearchResultCard__footerItem')].map(li => li.textContent.trim().replace(/\\s+/g,' '));
                const location = footer.length > 1 ? footer[1] : '';
                if(!company && footer.length) company = footer[0];
                items.push({title, href, company:(company||'Unknown').trim(), location});
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
            all_jobs.append(job(
                item["title"], item["href"],
                item.get("company") or "Unknown",
                item.get("location") or "",
            ))
            new += 1
        if new == 0:
            break
    return all_jobs
