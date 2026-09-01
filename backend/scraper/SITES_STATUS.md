# Europe job scrapers — country status

Status of each country/website scraper under `backend/scraper/sites/`.

| Status | Meaning |
|--------|---------|
| **Working** | Dedicated scraper returns jobs |
| **Anti-bot / closed** | Cloudflare, login, CDN, or site shut down |

---

## Working

| Country | Website | Scraper file | Notes |
|---------|---------|--------------|-------|
| Austria | karriere.at | `austria_karriere.py` | Verified |
| Bosnia and Herzegovina | mojposao.ba | `bosnia_mojposao.py` | **Fixed** — `pretraga-poslova/?searchWord=` (~74 for software) |
| Croatia | moj-posao.net | `croatia_moj_posao.py` | OK |
| Cyprus | cyprusjobs.com | `cyprus_cyprusjobs.py` | OK |
| Czech Republic | jobs.cz | `czech_jobs_cz.py` | Verified |
| Denmark | jobindex.dk | `denmark_jobindex.py` | Verified |
| Finland | tyomarkkinatori.fi | `finland_tyomarkkinatori.py` | Verified (25 for sap). Alias: te-palvelut.fi |
| France | pole-emploi.fr / francetravail.fr | `france_pole_emploi.py` | **Fixed** — `candidat.francetravail.fr` (~20+) |
| Hungary | profession.hu | `hungary_profession.py` | OK |
| Iceland | alfred.is | `iceland_alfred.py` | **Fixed** — `userapi.alfred.is/api/v2/jobs` (~11 for software) |
| Ireland | jobsireland.ie | `ireland_jobsireland.py` | **Fixed** — BrowseJobs HTML API |
| Kosovo | kosovajob.com | `kosovo_kosovajob.py` | OK |
| Montenegro | zaposli.me | `montenegro_zaposli.py` | OK |
| North Macedonia | vrabotuvanje.com.mk | `northmacedonia_vrabotuvanje.py` | **Fixed** — `rabotni-mesta?searchWord=` (~40) |
| Norway | finn.no | `norway_finn.py` | OK |
| Portugal | net-empregos.com | `portugal_net_empregos.py` | Verified |
| Romania | ejobs.ro | `romania_ejobs.py` | OK |
| Serbia | infostud.com | `serbia_infostud.py` | OK |
| Slovenia | mojedelo.com | `slovenia_mojedelo.py` | OK |
| Spain | infojobs.net | `spain_infojobs.py` | OK |
| Sweden | arbetsformedlingen.se | `sweden_arbetsformedlingen.py` | OK |
| Switzerland | jobs.ch | `switzerland_jobs_ch.py` | OK |
| United Kingdom | reed.co.uk | `uk_reed.py` | Verified |

---

## Anti-bot / closed

| Country | Website | Scraper file | Reason |
|---------|---------|--------------|--------|
| Albania | duapune.com | `albania_duapune.py` | Cloudflare Turnstile (403) — works in browser only |
| Belgium | vdab.be | `belgium_vdab.py` | Login + Friendly Captcha |
| Bulgaria | jobs.bg | `_blocked.py` | Cloudflare 403 |
| Estonia | cv.ee | `_blocked.py` | Cloudflare |
| Germany | stepstone.de | `_blocked.py` | CDN Access Denied |
| Greece | kariera.gr | `greece_kariera.py` | Cloudflare blocked |
| Ireland | jobs.ie | `ireland_jobs_ie.py` | CDN Access Denied |
| Italy | infojobs.it | `italy_infojobs.py` | **Site closed** |
| Latvia | cv.lv | `latvia_cv_lv.py` | Search HTTP 500 under automation |
| Lithuania | cvbankas.lt | `_blocked.py` | Cloudflare |
| Luxembourg | jobs.lu | `_blocked.py` | Akamai |
| Malta | keepmeposted.com.mt | `malta_keepmeposted.py` | Cloudflare 403 |
| Poland | pracuj.pl | `_blocked.py` | Cloudflare |
| Slovakia | profesia.sk | `_blocked.py` | CDN blocked |
| The Netherlands | nationalevacaturebank.nl | `netherlands_nationalevacaturebank.py` | Anti-bot |
| Ukraine | robota.ua | `ukraine_robota.py` | Anti-bot |

---

## Quick counts

| Category | Sites |
|----------|-------|
| Working | **23** |
| Anti-bot / closed | **16** |

---

## Recheck notes (unverified → fixed)

| Site | Old problem | New approach |
|------|-------------|--------------|
| mojposao.ba | Wrong URL (`/posao?q=`) | `/pretraga-poslova/?searchWord=` + `.mp-card` |
| francetravail.fr | Generic link harvest missed cards | `li.result a[href*="/detail/"]` |
| alfred.is | Cards have no `<a href>` | JSON API `userapi.alfred.is/api/v2/jobs` |
| jobsireland.ie | Wrong `/job-search-results` 404 | `Jobsireland.API/.../BrowseJobs` HTML |
| vrabotuvanje.com.mk | Homepage `?s=` noise | `/rabotni-mesta?searchWord=` + `.mp-card` |
| kariera.gr / jobs.ie / cv.lv / infojobs.it | — | Marked anti-bot or closed (honest error, not empty) |
