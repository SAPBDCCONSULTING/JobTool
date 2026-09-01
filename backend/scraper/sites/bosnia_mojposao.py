"""Bosnia and Herzegovina — MojPosao.ba."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Bosnia and Herzegovina"
DOMAIN = "mojposao.ba"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 5):
        url = f"https://www.mojposao.ba/pretraga-poslova/?searchWord={q}&page={page_num}"
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items = [], seen = new Set();
              document.querySelectorAll('.mp-card, .job-card').forEach(card => {
                const a = card.querySelector('a[href*="/posao/"]');
                if (!a) return;
                const href = (a.href || '').split('?')[0];
                const title = a.textContent.trim().replace(/\\s+/g, ' ');
                if (!href || title.length < 8 || seen.has(href)) return;
                if (/pretraži|profili|kalkulator|prijava/i.test(title)) return;
                seen.add(href);
                const texts = Array.from(card.querySelectorAll('span, div, p'))
                  .map(el => el.textContent.trim().replace(/\\s+/g, ' '))
                  .filter(t => t && t !== title && t.length > 1 && t.length < 80);
                let company = 'Unknown';
                let location = '';
                for (const t of texts) {
                  if (/premium|novi posao|prijava do|exclusive/i.test(t)) continue;
                  if (/sarajevo|banja|mostar|tuzla|zenica|bih|remote/i.test(t) && !location) {
                    location = t;
                    continue;
                  }
                }
                // company often appears near logo / employer line
                const emp = card.querySelector('[class*="company" i], [class*="employer" i], img[alt]');
                if (emp) {
                  const c = (emp.getAttribute('alt') || emp.textContent || '').trim();
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
