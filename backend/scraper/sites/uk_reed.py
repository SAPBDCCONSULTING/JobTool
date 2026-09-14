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


def _date_to_iso(text: str) -> str:
    """Convert English relative dates ('9 hrs ago', '3 days ago') to ISO 8601."""
    import re as _re
    from datetime import datetime, timedelta, timezone

    if not text:
        return ""
    low = text.lower()
    now = datetime.now(timezone.utc)
    m = _re.search(r"(\d+)\s+(mins?|hrs?|hours?|days?|weeks?|months?)\s+ago", low)
    if m:
        qty = int(m.group(1))
        unit = m.group(2)
        if unit.startswith("min"):
            delta = timedelta(minutes=qty)
        elif unit.startswith("h"):
            delta = timedelta(hours=qty)
        elif unit.startswith("day"):
            delta = timedelta(days=qty)
        elif unit.startswith("week"):
            delta = timedelta(weeks=qty)
        else:
            delta = timedelta(days=qty * 30)
        return (now - delta).isoformat()
    if "yesterday" in low:
        return (now - timedelta(days=1)).isoformat()
    if "today" in low or "just now" in low:
        return now.isoformat()
    return ""


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
                const posted=(card.querySelector('[data-qa="job-posted-by"], [class*="posted" i]')||{}).textContent||'';
                // "9 hrs ago by NG Bailey" -> "NG Bailey"
                let company = 'Unknown';
                const bym = posted.match(/by\s+(.+)$/i);
                if (bym && bym[1].trim().length > 1) company = bym[1].trim().replace(/\s+$/,'');
                const loc=(card.querySelector('[data-qa="job-card-location"], [class*="location" i]')||{}).textContent||'';
                const dateEl=(card.querySelector('[class*="posted" i],[data-test*="posted"]')||{}).textContent||'';
                items.push({title, href, company, location:(loc||'').trim(), date: posted.replace(/by\s+.+$/i,'').trim()});
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
                job(
                    item["title"],
                    item["href"],
                    item.get("company") or "Unknown",
                    item.get("location") or "",
                    publishedAt=_date_to_iso(item.get("date") or ""),
                )
            )
            new += 1
        if new == 0:
            break
    return all_jobs
