"""Hungary — Profession.hu."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Hungary"
DOMAIN = "profession.hu"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 6):
        url = f"https://www.profession.hu/allasok/{q}?page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('.advertisement-result-list-item, .dsx-card').forEach(card => {
                const a=card.querySelector('a[href*="/allasok/"], h2 a, h3 a, a.ds-heading-3');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href.includes('profession.hu')||title.length<8||seen.has(href)||title.startsWith('http')) return;
                seen.add(href);
                const company=(card.querySelector('[class*="company" i]')||{}).textContent||'';
                items.push({title, href, company:(company||'Unknown').trim().slice(0,100)});
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
