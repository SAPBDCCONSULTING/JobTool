"""Albania — duapune.com.

Search URL (confirmed in browser):
  https://duapune.com/search/advanced/filter?keyword={keyword}&category=&city_id=

Headless Playwright is blocked by Cloudflare; scraper raises BotBlockedError
so the UI does not show a false "No jobs found".
"""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import BotBlockedError, detect_bot_block, dismiss_cookies, job, wait_cloudflare

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Albania"
DOMAIN = "duapune.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://duapune.com/search/advanced/filter?keyword={q}&category=&city_id="
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)

    cleared = await wait_cloudflare(page, seconds=25)
    if not cleared:
        raise BotBlockedError(
            DOMAIN,
            "Cloudflare bot verification blocks automated scraping (Turnstile). Needs proxy.",
        )

    reason = await detect_bot_block(page)
    if reason:
        raise BotBlockedError(DOMAIN, reason)

    await dismiss_cookies(page)
    await asyncio.sleep(2)

    # Confirm we landed on results (Albanian: "N postime aktive")
    try:
        await page.wait_for_function(
            "() => /\\d+\\s*postime/i.test(document.body.innerText) || "
            "document.querySelectorAll('a[href*=\"/job\"], a[href*=\"/pune\"]').length > 3",
            timeout=15000,
        )
    except Exception:
        pass

    raw = await page.evaluate(
        """() => {
          const items = [], seen = new Set();
          const skip = /cookie|login|identifikohu|kërko|kerko|advanced|menu|regjistro/i;

          // Prefer card containers from advanced search results
          const cards = document.querySelectorAll(
            '.card, .job-card, [class*="job-list"], [class*="postim"], article, .media, .list-group-item'
          );
          const pickFromCard = (card) => {
            const a =
              card.querySelector('a[href*="/job"]') ||
              card.querySelector('a[href*="/pune"]') ||
              card.querySelector('h2 a, h3 a, h4 a, h5 a, .job-title a, a.stretched-link') ||
              null;
            if (!a) return;
            const href = a.href || '';
            const title = a.textContent.trim().replace(/\\s+/g, ' ');
            if (!href || title.length < 5 || title.length > 160 || skip.test(title) || seen.has(href)) return;
            // detail links usually have an id segment
            if (!/\\/(job|jobs|pune|njoftim|post)\\//i.test(href) && !/\\/\\d{2,}/.test(href)) return;
            seen.add(href);
            let company = 'Unknown';
            let location = '';
            const texts = Array.from(card.querySelectorAll('p, span, div, small, h6'))
              .map(el => el.textContent.trim().replace(/\\s+/g, ' '))
              .filter(t => t && t !== title && t.length > 1 && t.length < 100);
            for (const t of texts) {
              if (/m[eë]\\s*shum[eë]|postime|aktiv/i.test(t)) continue;
              if (/tiran|durr|vlore|shkod|elbasan|korç|albania|remote|\\+/i.test(t) && t.length < 60) {
                if (!location) location = t;
                continue;
              }
              if (!/^\\d{2}[-./]\\d{2}/.test(t) && company === 'Unknown' && t.length < 80) {
                company = t;
              }
            }
            items.push({ title, href, company, location });
          };

          if (cards.length) {
            cards.forEach(pickFromCard);
          }

          if (items.length < 3) {
            document.querySelectorAll('a[href*="/job"], a[href*="/pune"], a[href*="/njoftim"]').forEach(a => {
              const href = a.href || '';
              const title = a.textContent.trim().replace(/\\s+/g, ' ');
              if (!href || title.length < 8 || title.length > 160 || skip.test(title) || seen.has(href)) return;
              if (/search|filter|advanced|login|category/i.test(href)) return;
              seen.add(href);
              items.push({ title, href, company: 'Unknown', location: '' });
            });
          }
          return items;
        }"""
    )

    if not raw:
        reason = await detect_bot_block(page)
        raise BotBlockedError(
            DOMAIN,
            reason
            or "Cloudflare / empty results for automated browser. Site works in a real browser only.",
        )

    return [
        job(
            title=item["title"],
            url=item["href"],
            company=item.get("company") or "Unknown",
            location=item.get("location") or "",
        )
        for item in raw
    ]
