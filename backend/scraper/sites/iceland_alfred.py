"""Iceland — alfred.is (JSON API)."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Iceland"
DOMAIN = "alfred.is"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    # Warm session / cookies on the public jobs page
    await page.goto(f"https://alfred.is/en/jobs?search={q}", wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(2)

    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 6):
        api = (
            f"https://userapi.alfred.is/api/v2/jobs?page={page_num}&size=50"
            f"&search={q}&translate=true"
        )
        resp = await page.request.get(api)
        if resp.status != 200:
            break
        data = await resp.json()
        rows = data.get("jobs") or []
        if not rows:
            break
        for row in rows:
            slug = row.get("slug") or ""
            title = (row.get("title") or "").strip()
            if not slug or not title or len(title) < 5:
                continue
            url = f"https://alfred.is/en/starf/{slug}"
            if url in seen:
                continue
            seen.add(url)
            company = (
                (row.get("companyName") or row.get("clientName") or row.get("company") or "")
                or "Unknown"
            )
            if isinstance(company, dict):
                company = company.get("name") or "Unknown"
            location = ""
            locs = row.get("locations") or row.get("location") or []
            if isinstance(locs, list) and locs:
                first = locs[0]
                location = first if isinstance(first, str) else (first.get("name") or "")
            elif isinstance(locs, str):
                location = locs
            all_jobs.append(job(title, url, str(company) or "Unknown", location))
        total_pages = int(data.get("totalPages") or 1)
        if page_num >= total_pages:
            break

    # Fallback: scrape visible cards + click-derived slug pattern from __NEXT_DATA__
    if not all_jobs:
        raw = await page.evaluate(
            """() => {
              try {
                const el = document.getElementById('__NEXT_DATA__');
                if (!el) return [];
                const data = JSON.parse(el.textContent);
                const jobs = data?.props?.pageProps?.jobs?.jobs || [];
                return jobs.map(j => ({
                  title: j.title || '',
                  slug: j.slug || '',
                  company: j.companyName || j.clientName || 'Unknown',
                  location: (j.locations && j.locations[0] && (j.locations[0].name || j.locations[0])) || ''
                }));
              } catch (e) { return []; }
            }"""
        )
        for item in raw:
            if not item.get("slug") or not item.get("title"):
                continue
            url = f"https://alfred.is/en/starf/{item['slug']}"
            if url in seen:
                continue
            seen.add(url)
            all_jobs.append(
                job(item["title"], url, item.get("company") or "Unknown", item.get("location") or "")
            )

    return all_jobs
