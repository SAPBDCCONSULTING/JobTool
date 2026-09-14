"""Cyprus — cyprusjobs.com."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Cyprus"
DOMAIN = "cyprusjobs.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()
    for page_num in range(1, 6):
        url = f"https://www.cyprusjobs.com/en/jobs?q={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)
        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('a[href*="/en/job/"], a[href*="/job/"]').forEach(a => {
                const href=a.href||'';
                if(!/\\/job\\/\\d+/.test(href)||seen.has(href)) return;
                let title=a.textContent.trim().replace(/\\s+/g,' ');
                if(title.length<10) return;
                seen.add(href);
                let company='Unknown', location='';
                const parts=title.split('·').map(s=>s.trim()).filter(Boolean);
                if(parts.length>=2){ title=parts[0]; company=parts[1]; if(parts[2]) location=parts[2]; }
                items.push({title, href, company, location});
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
