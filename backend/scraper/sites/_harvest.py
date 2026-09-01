"""Shared link-harvest helper for simpler country scrapers."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page


async def harvest_links(
    page: "Page",
    search_url: str,
    *,
    href_includes: str,
    href_regex: str = "",
    skip_title_re: str = r"cookie|login|register|search|home|menu",
    wait: float = 2.5,
    max_items: int = 100,
) -> list[dict]:
    await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
    await dismiss_cookies(page)
    await asyncio.sleep(wait)
    raw = await page.evaluate(
        """([hrefIncludes, hrefRegex, skipTitleRe, maxItems]) => {
          const items = [], seen = new Set();
          const skip = new RegExp(skipTitleRe, 'i');
          const hrefRe = hrefRegex ? new RegExp(hrefRegex, 'i') : null;
          document.querySelectorAll('a[href]').forEach(a => {
            const href = a.href || '';
            if (!href.includes(hrefIncludes)) return;
            if (hrefRe && !hrefRe.test(href)) return;
            const title = a.textContent.trim().replace(/\\s+/g, ' ');
            if (!title || title.length < 8 || title.length > 180 || skip.test(title)) return;
            if (seen.has(href)) return;
            seen.add(href);
            const card = a.closest('article,li,div,section,tr');
            let company = 'Unknown';
            if (card) {
              const c = card.querySelector('[class*="company" i],[class*="employer" i],[data-company]');
              if (c) company = c.textContent.trim().replace(/\\s+/g, ' ') || 'Unknown';
            }
            items.push({ title, href, company });
          });
          return items.slice(0, maxItems);
        }""",
        [href_includes, href_regex, skip_title_re, max_items],
    )
    return [job(i["title"], i["href"], i.get("company") or "Unknown") for i in raw]


def q(keyword: str) -> str:
    return quote_plus(keyword.strip())
