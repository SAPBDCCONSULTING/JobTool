"""Shared helpers for per-site scrapers."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page


class BotBlockedError(Exception):
    def __init__(self, domain: str, detail: str = ""):
        self.domain = domain
        self.detail = detail or "Website blocked automated scraping (anti-bot / CDN)."
        super().__init__(f"{domain}: {self.detail}")


async def dismiss_cookies(page: "Page") -> None:
    selectors = [
        "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
        "#onetrust-accept-btn-handler",
        'button:has-text("Allow all")',
        'button:has-text("Accept All")',
        'button:has-text("Accept all")',
        'button:has-text("Salli kaikki")',
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("Akzeptieren")',
        'button:has-text("Alle akzeptieren")',
        'button:has-text("Sutinku")',
        'button:has-text("Prihvati")',
        'button[id*="accept" i]',
        'button[class*="accept" i]',
    ]
    for sel in selectors:
        try:
            btn = page.locator(sel).first
            if await btn.is_visible(timeout=1500):
                await btn.click()
                await asyncio.sleep(1)
                return
        except Exception:
            continue


async def wait_cloudflare(page: "Page", seconds: int = 20) -> bool:
    for _ in range(seconds):
        title = (await page.title()).lower()
        if "moment" not in title and "attention required" not in title and "just a" not in title:
            return True
        await asyncio.sleep(1)
    return False


async def detect_bot_block(page: "Page") -> str | None:
    title = (await page.title()).lower()
    try:
        body = (await page.inner_text("body")).lower()[:500]
    except Exception:
        body = ""
    if "access denied" in title or "access denied" in body:
        return "CDN Access Denied (Akamai/Cloudflare)"
    if "just a moment" in title or "attention required" in title:
        return "Cloudflare challenge not cleared"
    if "verify you are human" in body or "checking your browser" in body:
        return "Bot verification page"
    if "privacy gate" in title or "privacy gate" in body:
        return "Privacy consent gate blocked scraping"
    return None


def job(
    title: str,
    url: str,
    company: str = "Unknown",
    location: str = "",
    description: str = "",
) -> dict:
    return {
        "title": title.strip(),
        "companyName": (company or "Unknown").strip() or "Unknown",
        "location": (location or "").strip(),
        "description": (description or "").strip(),
        "url": url,
        "jobId": url,
    }
