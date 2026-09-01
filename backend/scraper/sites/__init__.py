"""Auto-register all country/website scrapers in this folder."""

from __future__ import annotations

import importlib
import pkgutil
from typing import TYPE_CHECKING, Awaitable, Callable
from urllib.parse import urlparse

from ._base import BotBlockedError
from ._blocked import BLOCKED_MODULES

if TYPE_CHECKING:
    from playwright.async_api import Page

    ScrapeFn = Callable[[Page, str], Awaitable[list[dict]]]

_REGISTRY: dict[str, "ScrapeFn"] = {}
_META: dict[str, dict] = {}


def _register(domain: str, scrape_fn: "ScrapeFn", country: str, aliases: list[str] | None = None) -> None:
    domain = domain.lower().replace("www.", "")
    _REGISTRY[domain] = scrape_fn
    _META[domain] = {"country": country, "domain": domain}
    for alias in aliases or []:
        alias = alias.lower().replace("www.", "")
        _REGISTRY[alias] = scrape_fn
        _META[alias] = {"country": country, "domain": domain, "alias_of": domain}


def _load_modules() -> None:
    package = __name__
    for mod in pkgutil.iter_modules(__path__):  # type: ignore[name-defined]
        name = mod.name
        if name.startswith("_"):
            continue
        module = importlib.import_module(f".{name}", package)
        domain = getattr(module, "DOMAIN", None)
        scrape_fn = getattr(module, "scrape", None)
        country = getattr(module, "COUNTRY", "")
        aliases = getattr(module, "ALIASES", []) or []
        if domain and scrape_fn:
            _register(domain, scrape_fn, country, list(aliases))

    for blocked in BLOCKED_MODULES:
        _register(blocked.DOMAIN, blocked.scrape, blocked.COUNTRY, list(getattr(blocked, "ALIASES", []) or []))


_load_modules()


def get_site_scraper(website_url: str) -> "ScrapeFn | None":
    host = urlparse(website_url).netloc.replace("www.", "").lower()
    if host in _REGISTRY:
        return _REGISTRY[host]
    for domain, fn in _REGISTRY.items():
        if host.endswith(domain):
            return fn
    return None


def list_scrapers() -> list[dict]:
    seen = set()
    out = []
    for domain, meta in _META.items():
        key = meta.get("alias_of") or domain
        if key in seen:
            continue
        seen.add(key)
        out.append({"domain": key, "country": meta.get("country", "")})
    return sorted(out, key=lambda x: (x["country"], x["domain"]))


__all__ = ["get_site_scraper", "list_scrapers", "BotBlockedError", "_REGISTRY"]
