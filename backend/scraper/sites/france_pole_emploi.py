"""France — France Travail (ex Pôle Emploi / francetravail.fr)."""

from __future__ import annotations

import asyncio
import re
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "France"
DOMAIN = "pole-emploi.fr"
ALIASES = ["francetravail.fr", "candidat.francetravail.fr"]


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 5):
        url = (
            "https://candidat.francetravail.fr/offres/recherche"
            f"?motsCles={q}&offresPartenaires=true&rayon=0&tri=0&page={page_num}"
        )
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        if page_num == 1:
            await dismiss_cookies(page)
            # France Travail privacy / cookie overlays
            for sel in [
                "#popin_tc_privacy_button_2",
                'button:has-text("Tout accepter")',
                'button:has-text("Accepter")',
                'button:has-text("Continuer sans accepter")',
            ]:
                try:
                    btn = page.locator(sel).first
                    if await btn.is_visible(timeout=1500):
                        await btn.click()
                        await asyncio.sleep(1)
                        break
                except Exception:
                    pass
        await asyncio.sleep(2)

        try:
            await page.wait_for_selector("li.result a.media, li.result a[href*='/detail/']", timeout=15000)
        except Exception:
            if page_num == 1:
                await asyncio.sleep(3)
            else:
                break

        raw = await page.evaluate(
            """() => {
              const items = [], seen = new Set();
              document.querySelectorAll('li.result').forEach(li => {
                const a = li.querySelector('a[href*="/detail/"], a.media');
                if (!a) return;
                const href = a.href || '';
                if (!/\\/detail\\/[A-Z0-9]+/i.test(href) || seen.has(href)) return;
                seen.add(href);
                // title is usually in media-heading / strong / first line
                const heading = li.querySelector('.media-heading, h2, h3, strong');
                let title = (heading ? heading.textContent : a.textContent || '').trim().replace(/\\s+/g, ' ');
                title = title.replace(/^\\(déjà vu\\)\\s*/i, '').trim();
                // strip location glued on same line if present later
                if (title.length < 8 || title.length > 180) return;
                let company = 'Unknown';
                let location = '';
                const sub = li.querySelector('.subtext, .media-body p, [class*="subtitle"]');
                const blob = (sub ? sub.textContent : li.textContent || '').replace(/\\s+/g, ' ');
                const locMatch = blob.match(/\\d{2,5}\\s*-\\s*[A-Za-zÀ-ÿ' -]+/);
                if (locMatch) location = locMatch[0].trim();
                const companyEl = li.querySelector('[class*="company" i], .media-body .subtext');
                if (companyEl) {
                  const c = companyEl.textContent.trim().replace(/\\s+/g, ' ');
                  if (c && c.length < 100 && !/^\\d{2}/.test(c)) company = c.split(/·|\\|/)[0].trim();
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
            href = item["href"]
            if href in seen:
                continue
            seen.add(href)
            title = re.sub(r"^\(déjà vu\)\s*", "", item["title"], flags=re.I).strip()
            # Trim trailing location glued into title if present
            title = re.split(r"\d{2}\s*-\s*", title)[0].strip() or title
            all_jobs.append(
                job(title, href, item.get("company") or "Unknown", item.get("location") or "")
            )
            new += 1
        if new == 0:
            break

        # Next page via UI if page param ignored
        if page_num < 4:
            try:
                nxt = page.locator('a[title*="page suivante" i], a:has-text("›"), button:has-text("Suivant")').first
                if await nxt.is_visible(timeout=1000):
                    await nxt.click()
                    await asyncio.sleep(2)
            except Exception:
                pass

    return all_jobs
