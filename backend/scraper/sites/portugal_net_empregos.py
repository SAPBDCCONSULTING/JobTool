"""Portugal — Net-Empregos."""

from __future__ import annotations

import asyncio
from urllib.parse import quote_plus
from typing import TYPE_CHECKING

from ._base import dismiss_cookies, job

if TYPE_CHECKING:
    from playwright.async_api import Page

COUNTRY = "Portugal"
DOMAIN = "net-empregos.com"
ALIASES: list[str] = []


async def scrape(page: "Page", keyword: str) -> list[dict]:
    q = quote_plus(keyword.strip())
    all_jobs: list[dict] = []
    seen: set[str] = set()

    for page_num in range(1, 6):
        url = (
            "https://www.net-empregos.com/pesquisa-empregos.asp"
            f"?page={page_num}&chaves={q}&cidade=&categoria=0&zona=0&tipo=0"
        )
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if page_num == 1:
            await dismiss_cookies(page)
        await asyncio.sleep(2)

        raw = await page.evaluate(
            """() => {
              const items=[], seen=new Set();
              document.querySelectorAll('.job-item').forEach(card => {
                const a=card.querySelector('h2 a.oferta-link, h2 a');
                if(!a) return;
                const href=a.href||'', title=a.textContent.trim();
                if(!href||title.length<5||seen.has(href)||!/\\/\\d+\\//.test(href)) return;
                seen.add(href);
                let company='Unknown', location='';
                card.querySelectorAll('li').forEach(li=>{
                  const t=li.textContent.trim();
                  if(li.querySelector('.flaticon-pin,[class*="pin"]')) location=t;
                  else if(li.querySelector('.fa-briefcase,[class*="briefcase"]')) company=t;
                });
                if(company==='Unknown'){
                  const lis=[...card.querySelectorAll('li')].map(li=>li.textContent.trim())
                    .filter(t=>t && t.length<120 && !/^\\d{1,2}-\\d{1,2}-\\d{4}$/.test(t));
                  if(lis.length>=2) company=lis[lis.length-1];
                }
                items.push({title, href, company, location});
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
                job(item["title"], item["href"], item.get("company") or "Unknown", item.get("location") or "")
            )
            new += 1
        if new == 0:
            break
    return all_jobs
