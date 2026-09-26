"""United States — Dice (tech job board)."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING
from urllib.parse import quote_plus

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "United States"
DOMAIN = "dice.com"
ALIASES: list[str] = []


def _date_to_iso(text: str) -> str:
    """Convert Dice relative dates ('Today', '4d ago', '19d ago') to ISO 8601."""
    import re as _re
    from datetime import datetime, timedelta, timezone

    if not text:
        return ""
    low = text.lower().strip()
    now = datetime.now(timezone.utc)

    m = _re.search(r"(\d+)\s*(mins?|hrs?|hours?|d|days?|w|weeks?|mo|months?)\s+ago", low)
    if m:
        qty = int(m.group(1))
        unit = m.group(2)
        if unit.startswith("min"):
            delta = timedelta(minutes=qty)
        elif unit.startswith("h"):
            delta = timedelta(hours=qty)
        elif unit.startswith("d"):
            delta = timedelta(days=qty)
        elif unit.startswith("w"):
            delta = timedelta(weeks=qty)
        else:  # month
            delta = timedelta(days=qty * 30)
        return (now - delta).isoformat()

    if "yesterday" in low:
        return (now - timedelta(days=1)).isoformat()
    if "today" in low or "just now" in low:
        return now.isoformat()
    return ""


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 5):
        url = f"https://www.dice.com/jobs?q={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(3)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('[data-testid="job-card"]').forEach(card => {
                const a = card.querySelector('[data-testid="job-search-job-detail-link"]');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim().replace(/\\s+/g,' ');
                if(!href||title.length<8||seen.has(href)) return;
                seen.add(href);
                let company = (card.querySelector('[data-testid="job-card-company-name"]')||{}).textContent || '';
                company = (company||'').trim().replace(/\\s+/g,' ') || 'Unknown';
                // Card text: "TITLE COMPANY LOCATION • POSTED TYPE SALARY"
                const full = (card.innerText||'').replace(/\\s+/g,' ').trim();
                let location='', posted='';
                const bIdx = full.indexOf('•');
                if (bIdx >= 0) {
                  let start = 0;
                  if (company !== 'Unknown') {
                    const cIdx = full.indexOf(company);
                    if (cIdx >= 0) start = cIdx + company.length;
                  }
                  location = full.slice(start, bIdx).trim();
                  const after = full.slice(bIdx + 1).trim();
                  const m = after.match(/^(Today|Yesterday|\\d+\\s*(?:mins?|hrs?|hours?|d|days?|w|weeks?|mo|months?)\\s+ago)/i);
                  if (m) posted = m[1];
                }
                items.push({title, href, company, location, date: posted});
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
