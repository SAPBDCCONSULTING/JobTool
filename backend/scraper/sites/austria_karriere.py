"""Austria — karriere.at."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Austria"
DOMAIN = "karriere.at"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 6):
        url = f"https://www.karriere.at/jobs?keywords={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('a[href*="/jobs/"]').forEach(a => {
                const href=a.href||'';
                if(!/\\/jobs\\/\\d+/.test(href)||seen.has(href)) return;
                const title=a.textContent.trim().replace(/\\s+/g,' ');
                if(title.length<8||title.length>200) return;
                seen.add(href);
                const card=a.closest('article,li,[class*="job" i],div')||a.parentElement;
                const companyEl=card?card.querySelector('[class*="company" i]'):null;
                const locEl=card?card.querySelector('[class*="location" i]'):null;
                items.push({
                  title, href,
                  company: companyEl?companyEl.textContent.trim():'Unknown',
                  location: locEl?locEl.textContent.trim():''
                });
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
