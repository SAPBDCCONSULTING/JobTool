#!/usr/bin/env python3
"""
Country-specific job scraper using Playwright.

Usage:
    python scrape.py --website "https://www.reed.co.uk" --keyword "SAP" --country "United Kingdom"

Outputs JSON array to stdout matching ApifyJobItem shape.
"""

import argparse
import asyncio
import json
import re
import sys
from urllib.parse import urlparse, quote_plus

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# Import per-site parsers (folder: scraper/sites/<country>_<website>.py)
from parsers import get_parser
from sites._base import BotBlockedError


def _is_english(text: str) -> bool:
    """Quick check if text is mostly ASCII/English."""
    if not text:
        return True
    ascii_chars = sum(1 for c in text if ord(c) < 128)
    return (ascii_chars / len(text)) > 0.8


async def _translate_to_english(page, texts: list[str]) -> list[str]:
    """Translate a batch of texts to English using the browser's built-in translation via Google Translate."""
    if not texts:
        return texts

    # Use Google Translate's unofficial API via page navigation
    translated = []
    batch_size = 20
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Join with separator for batch translation
        joined = "\n---\n".join(batch)
        encoded = quote_plus(joined)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={encoded}"
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=10000)
            if resp and resp.status == 200:
                body = await page.inner_text("body")
                # Parse the JSON response
                data = json.loads(body)
                result = "".join(seg[0] for seg in data[0] if seg[0])
                parts = result.split("---")
                for part in parts:
                    translated.append(part.strip())
            else:
                translated.extend(batch)
        except Exception:
            translated.extend(batch)

    return translated


async def generic_scrape(page, website_url: str, keyword: str) -> list[dict]:
    """
    Generic scraper: navigates to the site, looks for a search input,
    enters the keyword, and extracts job cards using common patterns.
    """
    await page.goto(website_url, wait_until="networkidle", timeout=30000)

    # Handle Cloudflare/bot challenges — wait up to 15s for them to resolve
    for _ in range(15):
        title = await page.title()
        if "moment" not in title.lower() and "checking" not in title.lower():
            break
        await asyncio.sleep(1)

    # Accept cookie consent if present
    for consent_sel in ['button:has-text("Accept")', 'button:has-text("ACCEPT")', '[id*="accept"]', '[class*="accept"]']:
        try:
            btn = await page.query_selector(consent_sel)
            if btn and await btn.is_visible():
                await btn.click()
                await asyncio.sleep(1)
                break
        except Exception:
            continue

    # Try to find and use a search input
    search_filled = False
    search_selectors = [
        'input[name*="keyword" i]',
        'input[name*="search" i]',
        'input[name*="query" i]',
        'input[name*="q" i]',
        'input[placeholder*="search" i]',
        'input[placeholder*="job" i]',
        'input[type="search"]',
        '#search-input',
        '#keywords',
    ]

    for sel in search_selectors:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                await el.fill(keyword)
                search_filled = True
                # Try to submit
                await page.keyboard.press("Enter")
                await page.wait_for_load_state("domcontentloaded", timeout=15000)
                await asyncio.sleep(2)
                break
        except Exception:
            continue

    if not search_filled:
        # Fallback: try URL-based search patterns
        domain = urlparse(website_url).netloc.replace("www.", "")
        search_urls = [
            f"{website_url}/search?q={quote_plus(keyword)}",
            f"{website_url}/jobs?keyword={quote_plus(keyword)}",
            f"{website_url}/search?keyword={quote_plus(keyword)}",
            f"{website_url}/?q={quote_plus(keyword)}",
        ]
        for url in search_urls:
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                if resp and resp.status < 400:
                    await asyncio.sleep(2)
                    break
            except Exception:
                continue

    # Extract jobs using common HTML patterns
    content = await page.content()
    soup = BeautifulSoup(content, "html.parser")

    jobs = []

    # Strategy 1: Look for common job card patterns
    card_selectors = [
        "article",
        '[class*="job-card"]',
        '[class*="job-item"]',
        '[class*="job-listing"]',
        '[class*="vacancy"]',
        '[class*="offer"]',
        '[data-job]',
        'li[class*="job"]',
        'div[class*="result"]',
    ]

    for selector in card_selectors:
        cards = soup.select(selector)
        if len(cards) >= 3:
            for card in cards[:50]:
                job = _extract_job_from_card(card, website_url)
                if job and job.get("title"):
                    jobs.append(job)
            if jobs:
                break

    # Strategy 2: If no structured cards found, look for link lists
    if not jobs:
        links = soup.select('a[href*="job"], a[href*="vacancy"], a[href*="offer"]')
        for link in links[:50]:
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if title and len(title) > 5 and len(title) < 200:
                jobs.append({
                    "title": title,
                    "companyName": "Unknown",
                    "location": "",
                    "description": "",
                    "url": href if href.startswith("http") else f"{website_url}{href}",
                    "jobId": href or title,
                })

    return jobs


def _extract_job_from_card(card, base_url: str) -> dict | None:
    """Extract job data from a BeautifulSoup card element."""
    # Find title (usually in a link inside h2/h3 or a prominent link)
    title_el = (
        card.select_one("h2 a, h3 a, h4 a")
        or card.select_one('a[class*="title"]')
        or card.select_one("a")
    )
    if not title_el:
        return None

    title = title_el.get_text(strip=True)
    if not title or len(title) < 3:
        return None

    href = title_el.get("href", "")
    url = href if href.startswith("http") else f"{base_url}{href}"

    # Find company
    company_el = (
        card.select_one('[class*="company"]')
        or card.select_one('[data-company]')
        or card.select_one('[class*="employer"]')
    )
    company = company_el.get_text(strip=True) if company_el else "Unknown"

    # Find location
    loc_el = (
        card.select_one('[class*="location"]')
        or card.select_one('[class*="city"]')
        or card.select_one('[data-location]')
    )
    location = loc_el.get_text(strip=True) if loc_el else ""

    # Find description
    desc_el = (
        card.select_one('[class*="description"]')
        or card.select_one('[class*="snippet"]')
        or card.select_one("p")
    )
    description = desc_el.get_text(strip=True) if desc_el else ""

    return {
        "title": title,
        "companyName": company,
        "location": location,
        "description": description,
        "url": url,
        "jobId": url or title,
    }


async def scrape(website_url: str, keyword: str, country: str) -> list[dict]:
    """Main scraping entrypoint. Raises BotBlockedError for anti-bot sites."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
            extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
        )
        # Hide webdriver flag
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        page = await context.new_page()

        try:
            # Check for site-specific parser
            parser = get_parser(website_url)
            if parser:
                jobs = await parser(page, keyword)
            else:
                jobs = await generic_scrape(page, website_url, keyword)
                # If generic found results, try page 2 and 3
                if len(jobs) >= 10:
                    for pg in range(2, 4):
                        try:
                            current_url = page.url
                            sep = '&' if '?' in current_url else '?'
                            next_url = f"{current_url}{sep}page={pg}"
                            await page.goto(next_url, wait_until="domcontentloaded", timeout=15000)
                            await asyncio.sleep(2)
                            more = await generic_scrape(page, website_url, keyword)
                            if not more:
                                break
                            jobs.extend(more)
                        except Exception:
                            break

            # Normalize output and filter garbage
            SKIP_TITLES = {
                'vind een job', 'find a job', 'search', 'home', 'login',
                'register', 'sign in', 'cookie', 'accept', 'menu',
                'jobsøgning', 'se jobbet', 'pretraži poslove', 'profili poslodavaca',
                'kalkulator plaće', 'for arbejdsgivere', 'for jobsøgere',
                'create profile', 'log ind', 'opret profil',
            }
            SKIP_TITLE_RE = re.compile(
                r'^(job|jobs|search|home|login|register|cookie|menu|next|prev|page\s*\d+)\s*$'
                r'|^\d+[\.\s]*\d*\s*job'
                r'|profili?\s'
                r'|privacy|cookie|newsletter',
                re.I,
            )
            results = []
            site_host = urlparse(website_url).netloc.replace("www.", "").lower()
            # Domains that may appear on job links even when scraping an alias URL
            ALLOWED_JOB_HOSTS = {
                "jobindex.dk",
                "mojposao.hr",
                "infostud.com",
                "francetravail.fr",
                "tyomarkkinatori.fi",
                "te-palvelut.fi",
            }
            for job in jobs:
                title = job.get("title", "").strip()
                if not title or len(title) < 8 or title.lower() in SKIP_TITLES:
                    continue
                if SKIP_TITLE_RE.search(title):
                    continue
                if title.lower().startswith("http"):
                    continue
                company = (job.get("companyName") or "").strip() or "Unknown"
                if company.lower() in {"unknown", "unknown company", "n/a", "-"}:
                    company = "Unknown"
                url = (job.get("url") or "").strip()
                if url:
                    host = urlparse(url).netloc.replace("www.", "").lower()
                    # Drop cross-domain junk (cookie CDNs, google support, etc.)
                    if host and site_host and site_host not in host and host not in site_host:
                        if not any(host.endswith(x) for x in ALLOWED_JOB_HOSTS):
                            # Dedicated parsers already validate URLs — keep them
                            if not parser:
                                continue
                results.append({
                    "jobId": job.get("jobId") or url or title,
                    "title": title,
                    "description": job.get("description", ""),
                    "companyName": company,
                    "location": job.get("location") or country,
                    "url": url,
                })

            # Translate non-English titles/descriptions to English
            if results:
                titles = [r["title"] for r in results]
                needs_translation = not all(_is_english(t) for t in titles)
                if needs_translation:
                    translated_titles = await _translate_to_english(page, titles)
                    descs = [r["description"] for r in results]
                    translated_descs = await _translate_to_english(page, descs) if any(d for d in descs) else descs
                    for i, r in enumerate(results):
                        if i < len(translated_titles):
                            r["title"] = translated_titles[i]
                        if i < len(translated_descs):
                            r["description"] = translated_descs[i]

            return results
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser(description="Scrape jobs from country-specific websites")
    parser.add_argument("--website", required=True, help="Job website URL")
    parser.add_argument("--keyword", required=True, help="Search keyword")
    parser.add_argument("--country", required=True, help="Country name")
    args = parser.parse_args()

    try:
        results = asyncio.run(scrape(args.website, args.keyword, args.country))
        print(json.dumps(results))
    except BotBlockedError as e:
        print(json.dumps({
            "error": "bot_blocked",
            "domain": e.domain,
            "message": f"Bot blocked: {e.detail}. This website cannot be scraped without a proxy.",
            "items": [],
        }))
    except Exception as e:
        print(json.dumps({"error": "scrape_failed", "message": str(e), "items": []}), file=sys.stderr)
        print(json.dumps([]))
        sys.exit(1)


if __name__ == "__main__":
    main()
