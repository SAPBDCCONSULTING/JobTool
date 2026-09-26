"""United States — The Muse (job board)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING
from urllib.parse import quote_plus

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "United States"
DOMAIN = "themuse.com"
ALIASES: list[str] = []

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _date_to_iso(text: str) -> str:
    """Convert The Muse relative dates ('Aug 22', 'Today', 'Yesterday') to ISO 8601."""
    import re as _re

    if not text:
        return ""
    low = text.lower().strip()
    now = datetime.now(timezone.utc)

    if "today" in low:
        return now.isoformat()
    if "yesterday" in low:
        return (now - timedelta(days=1)).isoformat()

    m = _re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})", low)
    if m:
        month = _MONTHS[m.group(1)[:3]]
        day = int(m.group(2))
        year = now.year
        dt = datetime(year, month, day, tzinfo=timezone.utc)
        if dt > now + timedelta(days=1):
            dt = datetime(year - 1, month, day, tzinfo=timezone.utc)
        return dt.isoformat()
    return ""


async def scrape(page: "Page", keyword: str) -> list[dict]:
    slug = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 4):
        url = f"https://www.themuse.com/search/keyword/{slug}/?page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(4)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('a[href*="/jobs/"]').forEach(a => {
                const href=a.href||'';
                if(!href||seen.has(href)) return;
                const tile = a.closest('[class*="jobTile" i]') || a.parentElement;
                const text = (tile ? tile.innerText : a.innerText).replace(/\\s+/g,' ').trim();
                // "TITLE At COMPANY - LOCATION Posted on DATE VIEW JOB APPLY ON COMPANY SITE"
                const m = text.match(/^(.+?)\\s+At\\s+(.+?)\\s+-\\s+(.+?)\\s+Posted on\\s+(.+?)\\s+VIEW JOB/i);
                if(!m) return;
                seen.add(href);
                items.push({
                  title: m[1].trim(),
                  href,
                  company: m[2].trim(),
                  location: m[3].trim(),
                  date: m[4].trim(),
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
