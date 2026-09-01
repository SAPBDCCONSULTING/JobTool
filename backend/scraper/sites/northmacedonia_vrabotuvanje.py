"""North Macedonia — vrabotuvanje.com.mk (MojPosao network)."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "North Macedonia"
DOMAIN = "vrabotuvanje.com.mk"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 5):
        url = f"https://www.vrabotuvanje.com.mk/rabotni-mesta?searchWord={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items = [], seen = new Set();
              document.querySelectorAll('.mp-card, .job-card, .job-card-container').forEach(card => {
                const a = card.querySelector('a[href*="/rabota/"]');
                if (!a) return;
                const href = (a.href || '').split('?')[0];
                const title = a.textContent.trim().replace(/\\s+/g, ' ');
                if (!href || title.length < 8 || seen.has(href)) return;
                if (/пребарај|kalkulator|компани/i.test(title)) return;
                seen.add(href);
                let company = 'Unknown';
                let location = '';
                const texts = Array.from(card.querySelectorAll('span, div, p'))
                  .map(el => el.textContent.trim().replace(/\\s+/g, ' '))
                  .filter(t => t && t !== title && t.length > 1 && t.length < 80);
                for (const t of texts) {
                  if (/пријава до|premium|нов/i.test(t)) continue;
                  if (/скопје|битола|охрид|македон|remote/i.test(t) && !location) {
                    location = t;
                    continue;
                  }
                }
                const img = card.querySelector('img[alt]');
                if (img) {
                  const c = (img.getAttribute('alt') || '').trim();
                  if (c && c.length < 80) company = c;
                }
                items.push({ title, href, company, location });
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
                )
            )
            new += 1
        if new == 0:
            break

    return all_jobs
