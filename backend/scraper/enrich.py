#!/usr/bin/env python3
"""
Generic job-description extractor.

Reads a JSON array of {url, source} objects from a file (or stdin), opens each
job detail page in one shared browser session, extracts the main description
text, and prints a JSON array of {url, description, blocked} results.

Usage:
    python enrich.py --file jobs.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from playwright.async_api import async_playwright

from sites._base import BotBlockedError, dismiss_cookies, wait_cloudflare


async def extract_description(page) -> str:
    """Extract the dominant text block of the page (job description)."""
    return await page.evaluate(
        """() => {
          // Remove noise
          document.querySelectorAll(
            'script,style,noscript,nav,header,footer,aside,form,iframe,' +
            '[class*="cookie" i],[class*="consent" i],[class*="banner" i],' +
            '[class*="sidebar" i],[class*="related" i],[class*="similar" i],' +
            '[class*="recommend" i],[class*="footer" i],[class*="header" i],' +
            '[class*="nav" i],[class*="menu" i],[class*="apply" i]'
          ).forEach(el => el.remove());

          const candidates = [];
          // Preferred containers first
          document.querySelectorAll(
            'article,[class*="job-description" i],[class*="jobDescription" i],' +
            '[class*="description" i],[class*="vacancy" i],[class*="detail" i],' +
            '[itemprop="description"],main,[role="main"]'
          ).forEach(el => {
            const t = (el.innerText || '').trim();
            if (t.length > 200) candidates.push(t);
          });
          // Fallback: the largest text block on the page
          if (candidates.length === 0) {
            document.querySelectorAll('div,section,td').forEach(el => {
              const t = (el.innerText || '').trim();
              if (t.length > 300) candidates.push(t);
            });
          }
          // Pick the longest candidate, then trim boilerplate overlap
          candidates.sort((a, b) => b.length - a.length);
          let text = candidates[0] || '';
          // Cut common trailing sections
          for (const marker of ['Apply now', 'Apply Now', 'Similar jobs', 'Similar Jobs',
                                'Other jobs', 'More jobs', 'Recommended jobs', 'Benachrichtigen']) {
            const idx = text.indexOf(marker);
            if (idx > 500) text = text.slice(0, idx);
          }
          return text.replace(/\\n{3,}/g, '\\n\\n').trim().slice(0, 20000);
        }"""
    )


async def run(urls: list[dict]) -> list[dict]:
    results: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        for entry in urls:
            url = entry.get("url", "")
            rec = {"url": url, "description": "", "blocked": False}
            if not url:
                results.append(rec)
                continue
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                for _ in range(10):
                    title = (await page.title()).lower()
                    if "moment" not in title and "attention" not in title:
                        break
                    await asyncio.sleep(1)
                await dismiss_cookies(page)
                if not await wait_cloudflare(page, 10):
                    raise BotBlockedError(url, "challenge page")
                await asyncio.sleep(1)
                rec["description"] = await extract_description(page)
            except BotBlockedError as e:
                rec["blocked"] = True
                rec["description"] = ""
                print(json.dumps({"warn": f"blocked: {e}"}), file=sys.stderr)
            except Exception as e:  # noqa: BLE001 — per-URL resilience
                rec["description"] = ""
                print(json.dumps({"warn": f"failed: {e}"}), file=sys.stderr)
            results.append(rec)
        await browser.close()
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract job descriptions from detail pages")
    parser.add_argument("--file", required=True, help="JSON file with [{url, source}, ...]")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as fh:
        urls = json.load(fh)

    results = asyncio.run(run(urls))
    print(json.dumps(results))


if __name__ == "__main__":
    main()
