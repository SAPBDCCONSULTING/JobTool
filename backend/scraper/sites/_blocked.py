"""Blocked / anti-bot sites — explicit stubs so UI gets a clear bot error."""

from __future__ import annotations

from typing import TYPE_CHECKING

from ._base import BotBlockedError

if TYPE_CHECKING:
    from playwright.async_api import Page


def _blocked(domain: str, country: str, reason: str):
    async def scrape(page: "Page", keyword: str) -> list[dict]:
        raise BotBlockedError(domain, reason)

    scrape.COUNTRY = country  # type: ignore[attr-defined]
    scrape.DOMAIN = domain  # type: ignore[attr-defined]
    return scrape


# Each entry: module-like attributes for the registry
luxembourg_jobs_lu = type(
    "Mod",
    (),
    {
        "COUNTRY": "Luxembourg",
        "DOMAIN": "jobs.lu",
        "ALIASES": [],
        "scrape": _blocked("jobs.lu", "Luxembourg", "CDN Access Denied (Akamai)"),
    },
)

lithuania_cvbankas = type(
    "Mod",
    (),
    {
        "COUNTRY": "Lithuania",
        "DOMAIN": "cvbankas.lt",
        "ALIASES": [],
        "scrape": _blocked("cvbankas.lt", "Lithuania", "Cloudflare / bot challenge blocks headless scrapers"),
    },
)

germany_stepstone = type(
    "Mod",
    (),
    {
        "COUNTRY": "Germany",
        "DOMAIN": "stepstone.de",
        "ALIASES": [],
        "scrape": _blocked("stepstone.de", "Germany", "CDN Access Denied"),
    },
)

poland_pracuj = type(
    "Mod",
    (),
    {
        "COUNTRY": "Poland",
        "DOMAIN": "pracuj.pl",
        "ALIASES": [],
        "scrape": _blocked("pracuj.pl", "Poland", "Cloudflare challenge blocks headless scrapers"),
    },
)

bulgaria_jobs_bg = type(
    "Mod",
    (),
    {
        "COUNTRY": "Bulgaria",
        "DOMAIN": "jobs.bg",
        "ALIASES": [],
        "scrape": _blocked("jobs.bg", "Bulgaria", "Cloudflare / Access Denied"),
    },
)

estonia_cv_ee = type(
    "Mod",
    (),
    {
        "COUNTRY": "Estonia",
        "DOMAIN": "cv.ee",
        "ALIASES": [],
        "scrape": _blocked("cv.ee", "Estonia", "Cloudflare Attention Required"),
    },
)

slovakia_profesia = type(
    "Mod",
    (),
    {
        "COUNTRY": "Slovakia",
        "DOMAIN": "profesia.sk",
        "ALIASES": [],
        "scrape": _blocked("profesia.sk", "Slovakia", "CDN blocked automated access"),
    },
)

BLOCKED_MODULES = [
    luxembourg_jobs_lu,
    lithuania_cvbankas,
    germany_stepstone,
    poland_pracuj,
    bulgaria_jobs_bg,
    estonia_cv_ee,
    slovakia_profesia,
]
