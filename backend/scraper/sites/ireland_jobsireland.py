"""Ireland — jobsireland.ie via BrowseJobs HTML API."""

from __future__ import annotations

import asyncio
import re
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from bs4 import BeautifulSoup

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Ireland"
DOMAIN = "jobsireland.ie"
ALIASES: list[str] = []

_API = (
    "https://jobsireland.ie/Jobsireland.API/JobsIreland/BrowseJobs/43"
    "?CareerlevelId=-1&keyWord={q}&location=&page={page}&pageSize=50"
    "&VacancyTypeId=-1&RemoteOrBlendedJobType=-1"
)


def _parse_jobs(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []
    seen: set[str] = set()

    # Each listing has a real JobTitle value (not the #JobTitle placeholder)
    for title_inp in soup.select('input[id="JobTitle"]'):
        title = (title_inp.get("value") or "").strip()
        if not title or title.startswith("#"):
            continue
        box = title_inp
        for _ in range(12):
            if box.parent is None:
                break
            box = box.parent
            if box.name == "div" and box.select_one('input[id="JobId"]'):
                break

        def _val(fid: str) -> str:
            el = box.select_one(f'input[id="{fid}"]')
            v = (el.get("value") if el else "") or ""
            return v.strip()

        job_id = _val("JobId")
        if not job_id or job_id.startswith("#") or job_id in seen:
            continue
        seen.add(job_id)
        location = _val("Location")
        if location.startswith("#"):
            location = ""
        ref = _val("JobReference")
        # Public detail URL uses job reference / id
        url = f"https://jobsireland.ie/en-US/job-details?JobId={job_id}"
        if ref and not ref.startswith("#"):
            url = f"https://jobsireland.ie/en-US/job-details?JobId={job_id}&ref={quote_plus(ref)}"

        # Prefer visible h3 if present nearby
        h3 = box.select_one(".job-title-box h3")
        if h3:
            t = h3.get_text(strip=True)
            if t and not t.startswith("#"):
                title = t

        out.append(
            {
                "title": title,
                "url": url,
                "company": "Unknown",
                "location": location,
            }
        )

    # Fallback: parse job-title-box blocks
    if not out:
        for h3 in soup.select(".job-title-box h3"):
            title = h3.get_text(strip=True)
            if not title or title.startswith("#") or "job found" in title.lower():
                continue
            parent = h3.find_parent("div", class_=re.compile(r"job|list|card|paid", re.I)) or h3.parent
            blob = parent.get_text(" ", strip=True) if parent else ""
            loc_m = re.search(r"(?:Location[:\s]*)?([A-Za-z].{5,80})", blob)
            ref_m = re.search(r"Ref:\s*(#?JOB-?\d+)", blob, re.I)
            job_id = ""
            if ref_m:
                job_id = re.sub(r"\D", "", ref_m.group(1))
            url = f"https://jobsireland.ie/en-US/browse-jobs#job-{job_id or title}"
            out.append({"title": title, "url": url, "company": "Unknown", "location": ""})

    return out


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    # Warm cookies
    await page.goto("https://jobsireland.ie/en-US/browse-jobs", wait_until="domcontentloaded", timeout=60000)
    await dismiss_cookies(page)
    await asyncio.sleep(1)

    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 5):
        api = _API.format(q=q, page=page_num)
        resp = await page.request.get(api)
        if resp.status != 200:
            break
        html = await resp.text()
        batch = _parse_jobs(html)
        if not batch:
            break
        new = 0
        for item in batch:
            key = item["url"]
            if key in seen:
                continue
            seen.add(key)
            all_jobs.append(
                job(item["title"], item["url"], item.get("company") or "Unknown", item.get("location") or "")
            )
            new += 1
        if new == 0:
            break
        # Stop if fewer than page size
        if len(batch) < 10:
            break

    return all_jobs
