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


def _date_to_iso(text: str) -> str:
    """Convert German relative dates ('vor 5 Tagen', 'gestern') to ISO 8601."""
    import re as _re
    from datetime import datetime, timedelta, timezone

    if not text:
        return ""
    low = text.lower()
    now = datetime.now(timezone.utc)
    m = _re.search(r"vor\s+(\d+)\s+(minuten?|stunden?|tagen?|täg|wochen?|monaten?)", low)
    if m:
        qty = int(m.group(1))
        unit = m.group(2)
        if unit.startswith("minut"):
            delta = timedelta(minutes=qty)
        elif unit.startswith("stund"):
            delta = timedelta(hours=qty)
        elif unit.startswith("tag") or unit.startswith("täg"):
            delta = timedelta(days=qty)
        elif unit.startswith("wochen"):
            delta = timedelta(weeks=qty)
        else:
            delta = timedelta(days=qty * 30)
        return (now - delta).isoformat()
    if "gestern" in low:
        return (now - timedelta(days=1)).isoformat()
    if "heute" in low or "gerade" in low:
        return now.isoformat()
    return ""


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
                const card=a.closest('.m-jobsListItem__dataContainer, .m-jobsListItem, article, li');
                if(!card) return;
                const companyEl=card.querySelector('.m-jobsListItem__companyName, [class*="company" i]');
                const locEl=card?.querySelector('[class*="location" i]');
                const dateEl=card?.querySelector('[class*="date" i]');
                items.push({
                  title, href,
                  company: companyEl?companyEl.textContent.trim():'Unknown',
                  location: locEl?locEl.textContent.trim():'',
                  date: dateEl?dateEl.textContent.trim():''
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
