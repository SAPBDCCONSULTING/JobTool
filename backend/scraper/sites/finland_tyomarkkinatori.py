"""Finland — Työmarkkinatori (Job Market Finland).

Official search:
  https://tyomarkkinatori.fi/en/personal-customers/vacancies?q={keyword}
Also aliases the old TE services domain.
"""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Finland"
DOMAIN = "tyomarkkinatori.fi"
ALIASES = ["te-palvelut.fi", "www.te-palvelut.fi"]


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    url = f"https://tyomarkkinatori.fi/en/personal-customers/vacancies?q={q}"
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    await dismiss_cookies(page)

    # SPA needs time after cookie consent
    try:
        await page.wait_for_function(
            "() => /\\d+\\s*jobs/i.test(document.body.innerText)",
            timeout=25000,
        )
    except Exception:
        await asyncio.sleep(5)

    await asyncio.sleep(2)

    raw = await page.evaluate(
        """() => {
          const items = [];
          const seen = new Set();
          document.querySelectorAll('a[href*="/personal-customers/vacancies/"], a[href*="/avoimet-tyopaikat/"]').forEach(a => {
            const href = a.href || '';
            // detail pages contain a UUID segment
            if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(href)) return;
            if (seen.has(href)) return;
            const title = a.textContent.trim().replace(/\\s+/g, ' ');
            if (title.length < 5 || title.length > 200) return;
            seen.add(href);

            const card = a.closest('article, li, section, div') || a.parentElement;
            let company = 'Unknown';
            let location = '';
            if (card) {
              const texts = Array.from(card.querySelectorAll('p, span, div'))
                .map(el => el.textContent.trim().replace(/\\s+/g, ' '))
                .filter(t => t && t.length > 1 && t.length < 120 && t !== title);
              // company is usually the first non-title line near the link
              for (const t of texts) {
                if (/^published|^application period|employment|full-time|valid until/i.test(t)) continue;
                if (/^[A-ZÅÄÖ].+|Oy|Ab|Ltd|Inc|GmbH/i.test(t) && t.length < 80) {
                  company = t;
                  break;
                }
              }
              for (const t of texts) {
                if (/helsinki|tampere|espoo|vantaa|oulu|turku|\\+\\s*\\d+\\s*other/i.test(t)) {
                  location = t;
                  break;
                }
              }
            }
            items.push({ title, href, company, location });
          });
          return items;
        }"""
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
