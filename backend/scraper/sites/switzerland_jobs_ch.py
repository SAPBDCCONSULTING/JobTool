"""Switzerland — jobs.ch."""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Switzerland"
DOMAIN = "jobs.ch"
ALIASES: list[str] = []

# "11 hours ago" / "2 weeks ago" / "Yesterday" prefixes
_DATE_RE = re.compile(
    r"^\s*[(\[]?\s*(?:(?:\d+\s+(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\s+ago)|(?:last\s+(?:week|month))|yesterday|today|just\s+posted)\s*[)\]]?\s*",
    re.I,
)


def _relative_to_iso(text: str) -> str:
    """Convert a scraped relative date to an ISO timestamp (best effort)."""
    now = datetime.now(timezone.utc)
    m = re.search(r"(\d+)\s+(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\s+ago", text, re.I)
    if not m:
        low = text.lower()
        if "yesterday" in low:
            return (now - timedelta(days=1)).isoformat()
        if "today" in low or "just posted" in low:
            return now.isoformat()
        if re.search(r"last\s+week", low):
            return (now - timedelta(weeks=1)).isoformat()
        if re.search(r"last\s+month", low):
            return (now - timedelta(days=30)).isoformat()
        return ""
    qty = int(m.group(1))
    unit = m.group(2).lower()
    delta = {
        "minute": timedelta(minutes=qty), "min": timedelta(minutes=qty),
        "hour": timedelta(hours=qty), "hr": timedelta(hours=qty),
        "day": timedelta(days=qty),
        "week": timedelta(weeks=qty),
        "month": timedelta(days=qty * 30),
    }.get(unit.rstrip("s"), timedelta(days=qty))
    return (now - delta).isoformat()


def _parse_card(text: str) -> dict:
    """Split a raw jobs.ch card blob into clean title / company / location.

    Card shape: "[2 weeks ago ]<TITLE>Place of work:<LOC>Workload:<W>
                 Contract type:<CT> position <COMPANY>[New][promoted]
                 [Easy apply]Is this job relevant to you?"
    """
    blob = re.sub(r"\s+", " ", text).strip()
    out = {"title": "", "company": "", "location": "", "posted": ""}

    m = _DATE_RE.match(blob)
    if m:
        out["posted"] = _relative_to_iso(m.group(0))
        blob = blob[m.end():].strip()

    cut = blob.find("Place of work:")
    title_part, meta = (blob[:cut], blob[cut:]) if cut != -1 else (blob, "")
    out["title"] = title_part.strip(" -–—:|") or ""

    loc = re.search(r"Place of work:\s*(.*?)\s*Workload:", meta)
    if loc:
        out["location"] = loc.group(1).strip()

    comp = re.search(
        r"position\s*(.*?)(?:\s+Is this job relevant.*)?$",
        meta,
    )
    if comp:
        company = comp.group(1)
        company = re.sub(r"\s*(?:promoted|Easy apply|New)\s*$", "", company).strip()
        out["company"] = company

    # Trim a trailing company name glued to the title (card text sometimes
    # ends the title with the employer when no metadata block was captured).
    if out["company"] and out["title"].lower().endswith(out["company"].lower()):
        out["title"] = out["title"][: -len(out["company"])].strip(" -–—:|")
    return out


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://www.jobs.ch/en/vacancies/?term={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(3)
    raw = await page.evaluate(
        """() => {
          const items=[], seen=new Set();
          document.querySelectorAll('a[href*="/vacancies/detail/"], a[href*="/stelle/"]').forEach(a => {
            const href=a.href||'', text=a.textContent.trim().replace(/\\s+/g,' ');
            if(!href.includes('jobs.ch')||text.length<8||seen.has(href)||/navigation|explore companies|salary/i.test(text)) return;
            seen.add(href);
            const card=a.closest('article,li,div');
            // Prefer a dedicated title node when the card has one
            const t=a.querySelector('h1,h2,h3,[class*="position" i],[class*="title" i]');
            const c=card?card.querySelector('[class*="company" i],[data-cy="job-card-company"]'):null;
            items.push({href, titleNode: t?t.textContent.trim().replace(/\\s+/g,' '):'', companyNode: c?c.textContent.trim().replace(/\\s+/g,' '):'', text});
          });
          return items;
        }"""
    )
    results: list[dict] = []
    for item in raw:
        parsed = _parse_card(item["text"])
        # DOM nodes win when they produced something usable
        title = item.get("titleNode") or parsed["title"]
        company = item.get("companyNode") or parsed["company"] or "Unknown"
        # A dedicated title node may still carry the date prefix / metadata
        if "Place of work:" in title:
            reparsed = _parse_card(title)
            title = reparsed["title"] or title
        title = re.sub(r"\s+", " ", title).strip(" -–—:|")
        if len(title) < 6:
            continue
        results.append(
            job(
                title,
                item["href"],
                company,
                location=parsed["location"],
                publishedAt=parsed["posted"],
            )
        )
    return results

