# SAP Hiring Intelligence Platform — Integrated Implementation Plan (v2)

> Built on the **current codebase**, integrating what already exists (Apify/LinkedIn ingestion, European country-job scrapers, shared processing pipeline, AI classification, region-filtered UI) and adding exactly what v1 needs. Keeps multi-source.

## Current State (verified in code)

**Already built ✓**
| Piece | Where |
|---|---|
| LinkedIn source (Apify actor) | `backend/src/services/apify.service.ts`, `services/ingest.service.ts`, `workers/ingestion.worker.ts` |
| Europe country sources (Python + Playwright) | `backend/scraper/` — `scrape.py`, `sites/*.py` (23 working, 16 anti-bot stubbed), auto-registry |
| Shared ingest pipeline | `processRawItems()` → `raw_jobs` → filter → `clean_jobs(PENDING)` → BullMQ `ai-classify` |
| AI classification worker | `workers/ai-classify.worker.ts` (batch claim `FOR UPDATE SKIP LOCKED`, chaining) |
| Deterministic filter | `services/filter.service.ts` (SAP/ERP/Cloud/Data keep-rules + exclude-rules) |
| API routes | `/api/search`, `/api/jobs`, `/api/companies`, `/api/stats`, `/api/scrape-country` |
| Frontend | Dashboard, Jobs (region tree + scrape UI), Companies, Sources pages; typed `lib/api.ts` |

**Gaps for v1 (the plan below fills these)**
1. **No `Keyword` entity / no management UI** — keywords are typed ad-hoc per scrape.
2. **No scheduling** — everything is manual; nothing runs automatically.
3. **No persistent run records** — country scrape status lives in an in-memory Map (lost on restart); Apify runs leave no DB trace.
4. **Country scrapes bypass the filter** (`skipFilter: true`) and spawn from the API process (blocking; not worker-safe; not queue-controlled).
5. **No cross-source dedup** — same job on LinkedIn vs a country site → counted twice (inflates company numbers).
6. **No company entity** — `/api/companies` does a string `GROUP BY companyName`; no company merging, no scoring, no "why".
7. **No company-level intelligence / opportunity score / outreach emails** — the actual product output.
8. **No auth, no tests, no deployment config for the Python scraper in the worker.**

## Target V1 Product (what the user sees)

- A **Keywords** page: manage `sap`, `sac`, `s/4hana`, etc. → saved with a schedule.
- The platform **automatically fetches** recent jobs for every enabled keyword **across sources** on a schedule (default every 6h) — LinkedIn + enabled European country websites.
- Jobs are deduplicated into **unique canonical jobs**, grouped by **company**.
- Each company gets **intelligence + an opportunity score + recommended services + evidence ("why")**.
- From a company you can **generate an outreach email draft** (AI), edit, copy, mark done.
- A **Runs** page shows every fetch/run, counts, and errors; **Sources** page shows site status + enable/disable.

## Scheduling Architecture (BullMQ)

```
scheduler (repeatable cron, default every 6h)
   └─ for each enabled Keyword K
        ├─ job: fetch K from LinkedIn (Apify)        → queue `source-fetch`
        └─ job: fetch K from each enabled country site → queue `source-fetch`
              │
              ▼  create SourceRun (RUNNING) → fetch → process → SUCCESS / FAILED
   ai-classify  (existing, extended outputs)          → queue `ai-classify`
        │
        ▼  mark Company.needsRecalc = true
   company-intel (debounced ~10 min, one job id per company → auto-coalesce)
        │
        ▼  metrics → company AI → opportunity score + explanation
   outreach-gen (on user demand per company)          → queue `outreach-gen`
   lifecycle (daily): canonical jobs unseen >14d → INACTIVE
```

Key design choices:
- **Persistent `SourceRun`** for every fetch (both sources), so Runs page + retry + monitoring work and survive restarts.
- **Country scrapes move into the worker** (`country-scrape` queue, concurrency ~2–3), spawning `scrape.py`; API route just enqueues and returns — no more blocking API process, status persisted.
- **All fetches idempotent** (source-identity hash + canonical jobHash) → safe to re-run.
- Scheduler interval and per-source concurrency are **configurable via env**.
---

# PHASE 1 — Integrate Multi-Source + Scheduling (foundation)
**Goal:** Keywords managed in the UI, sources scheduled & recorded, both sources feeding one deduplicated canonical pipeline.

## 1.1 Schema (Prisma migration — evolve, don't rebuild)
Keep existing `raw_jobs` / `clean_jobs` (lowest churn), add/extend:

| Model / column | Purpose |
|---|---|
| `Keyword` | term, category, enabled, scheduleHours (default 6) |
| `Source` | name (LinkedIn `apify` / site domain), type (`apify`/`scraper`), country, enabled, lastRunAt |
| `SourceRun` | sourceId, keywordId, status, counts (fetched/new/dup/filtered/failed), error, startedAt/finishedAt |
| `RawJob` + `sourceRunId`, `keywordId`, `canonicalJobId?` | provenance of every raw record |
| `clean_jobs` + `jobHash`, `companyId?`, `lifecycleStatus`, `lastSeenAt`, `url`, `countryCode` | becomes the canonical job |
| `Company` | name, normalizedName (unique), aliases[], domain?, country |
| `OutreachEmail` | companyId, subject, body, status, model, timestamps |
| `CompanyIntelligence` | activeJobs, jobs7d/30d, topTechnologies, likelyInitiative, recommendedServices[], evidence[], score, scoreBreakdown, scoreExplanation, formulaVersion, model, updatedAt |

## 1.2 Company resolution + cross-source dedup (in `processRawItems`)
1. Resolve/auto-create `Company` from normalized companyName (+ aliases).
2. Compute `jobHash = sha1(normalized company + title + location)`.
3. Existing raw record with same source identity (jobId+country) → link, refresh `lastSeenAt`; **no duplicate, no re-AI**.
4. New raw → lookup ACTIVE canonical job with same `jobHash` within 90 days → link (`canonicalJobId`), refresh; else create new canonical job.
5. This stops LinkedIn↔country-site duplicates from inflating company counts.

## 1.3 Keyword API + scheduler
- `GET/POST/PATCH/DELETE /api/keywords` (CRUD + enabled + interval).
- `POST /api/runs/trigger` — manual "run all enabled keywords now".
- New `scheduler` process (runs inside worker): BullMQ repeatable job → fans out per keyword × enabled source onto `source-fetch`.
- Repeatable jobs re-synced whenever keywords/enabled-sources change.

## 1.4 SourceRun persistence + country scrape via worker
- New `country-scrape` worker: creates `SourceRun(RUNNING)` → spawns `venv/bin/python3 scrape.py --website … --keyword … --country …` → parses stdout → `processRawItems` → updates run counts → SUCCESS/FAILED (with `bot_blocked`/error mapped).
- `POST /api/scrape-country` becomes: enqueue + return `{ runId }`; frontend polls `GET /api/runs/:id` instead of the in-memory map.
- Update **`Dockerfile.worker`** to a Python-capable image (or multi-stage) so the worker container can run `scrape.py`; same for the dev worker env.

## 1.5 Frontend: Keywords + Sources + Runs
- **Keywords page:** add/edit/toggle keywords, per-keyword schedule, "Run now".
- **Sources page:** reuse existing region-tree UI; add working/blocked status badges (from `SITES_STATUS` data) + enable/disable toggle + last run time.
- **Runs page:** table of `SourceRun`s — source, keyword, country, counts, status, error, time + retry button.
- Demo-data fallback removed for these new pages only (rest of app unchanged until Phase 3).

## ✅ Phase 1 Exit Criteria — COMPLETE ✅ (verified live 2026-09-05)
- [x] Keyword CRUD + "Run now" triggers fetches from LinkedIn **and** enabled country sites.
- [x] Automatic scheduled run every N hours (verified via Runs page — scheduler fired on cron).
- [x] `SourceRun` rows persisted with correct counts; failed/bot-blocked runs marked.
- [x] Same real job seen via LinkedIn + a country site counts once (dedup verified: re-run → 0 new / 22 dup).
- [x] Country scrape works from the **worker** (API no longer blocks/spawns).

**Live verification data:** 2,468 raw records → 520 canonical jobs → 520 AI-processed (0 pending);
25+ successful scheduled runs across reed.co.uk, jobs.ch, arbetsformlingen.se, infojobs.net,
tyomarkkinatori.fi + LinkedIn/Apify. Transient site timeouts correctly recorded as FAILED runs
with retry buttons in the Runs UI.
---

# PHASE 2 — Company Intelligence & Opportunity Scoring
**Goal:** Turn canonical jobs into ranked, explainable company opportunities.

## 2.1 Qualification refinement
- Apply the **exclude-rules always** (both sources) so HR/sales/marketing/recruiter jobs never reach AI (cost control).
- Include-rule behavior per keyword category: tech keywords (sap, sac, s/4hana…) use keyword-aware keep rules; site-searched results keep matching keyword jobs even if the generic include regex misses.
- Keep `skipFilter` only as an explicit admin override for debugging.

## 2.2 Job AI analysis (extend existing worker + schema)
- Extend `ai-classifier.service.ts` output to v1 schema (zod-validated): `relevance_score` 0–100, `confidence`, `technologies[]`, `role_category`, `seniority`, `project_type`, `outsourcing_potential`, `summary` — plus existing `reason`.
- AI worker writes these to `clean_jobs` (canonical job) and stores model/prompt version.
- **Never re-run AI** for a raw hit linked to an analyzed canonical job (content-hash check) — existing idempotency stays intact.

## 2.3 Company recalculation (debounced)
- On canonical create/analyze → `Company.needsRecalc = true`.
- BullMQ `company-intel` queue with **job id = companyId** + ~10-min delay → repeated marks coalesce into one run (natural debounce).
- Compute deterministic metrics from **all active canonical jobs**: activeCount, jobs7d, jobs30d, technology distribution, notable roles.

## 2.4 Company AI intelligence
- Call LLM with only the aggregated metrics + role/tech summary (never raw descriptions).
- Output: `likelyInitiative`, `recommendedServices[]` (from the reference service list), `evidence[]` ("why this company"), short summary.

## 2.5 Opportunity score (deterministic + explainable)
- Versioned formula (env-configurable weights, default): relevance 30% · volume 25% · velocity 25% · outsourcing potential 20%.
- Store component breakdown + human-readable explanation generated from metrics + evidence.
- Dashboard shows: **score + why**.

## 2.6 Lifecycle
- Daily `lifecycle` job: canonical jobs with `lastSeenAt` > 14 days → `INACTIVE` (excluded from metrics). Re-observed → back to ACTIVE. (no STALE/ARCHIVED in v1)

## ✅ Phase 2 Exit Criteria — COMPLETE ✅ (verified live 2026-09-05)
- [x] Non-relevant jobs (both sources) filtered before AI; verified from SourceRun `filtered` counts + logs.
- [x] Every analyzed job has the full v1 AI schema (relevance, technologies, role, seniority, project type, outsourcing, summary + model/prompt version).
- [x] Companies show: active jobs, 7/30d counts, top technologies, likely initiative, recommended services, evidence.
- [x] Every scored company has a score + component breakdown + explanation (formula `opportunity-v1`, env-configurable weights).
- [x] Lifecycle worker registered (daily 04:00 sweep; 14-day INACTIVE rule).
- [x] Debounced company recalculation (job-id coalescing per company, 10-min window) + manual recalculate endpoint.
- [x] Reprocessing endpoint (PRD §37): `POST /api/runs/reprocess` re-analyzes legacy jobs with the current prompt version.

**Live verification:** fresh reed.co.uk job → v2 analysis (relevance 85, role functional, tech [SuccessFactors, Employee Central], outsourcing 0.6) → company recalc → score 86 (relevance 77×30 · volume 100×25 · velocity 100×25 · outsourcing 65×20) with initiative "S/4HANA migration program" + 4 recommended services + evidence. Bulk reprocess of 520 legacy jobs running through the same pipeline automatically.

---

# PHASE 3 — Product Surface: Outreach + Company Views
**Goal:** The v1 product pages on live data — companies ranked, company detail, outreach emails.

## 3.1 API
- `GET /api/companies` — ranked by opportunity score; filters (country, technology, min score, search).
- `GET /api/companies/:id` — score + breakdown + explanation, intelligence, active/historical jobs, evidence, recommended services.
- `POST /api/companies/:id/outreach` → enqueue `outreach-gen`; `GET /api/outreach` list; `PATCH /api/outreach/:id` edit/mark done.
- `GET /api/jobs` extended filters: `source`, `lifecycleStatus`, `keyword`, `technology`.
- `GET /api/runs/:id` for the Sources/Jobs pages to poll.

## 3.2 Pages
- **Dashboard:** stats cards + top 10 companies by score.
- **Companies:** table (score, confidence, active jobs, recent hiring, initiative, services, last updated) → **Company detail** (why, jobs, tech breakdown, generate outreach).
- **Outreach:** list of drafts with inline edit + copy + status; regenerate.
- **Jobs:** keep region-tree scrape + filters; add source/status/technology filters and company link-through.
- **Keywords / Sources / Runs:** completed surfaces from Phase 1.

## 3.3 Frontend foundation
- Wire all pages to the real API (drop demo mode by default).
- Consistent professional design tokens; loading/empty/error states; responsive.

## ✅ Phase 3 Exit Criteria — COMPLETE ✅ (verified live 2026-09-05)
- [x] Company dashboard ordered by score with working filters; detail page complete.
- [x] Outreach draft generation produces editable, copyable emails for a company.
- [x] End-to-end: schedule run → jobs appear → company scored → outreach generated.

**Live verification:** 200 companies all scored (top: CGI @ 92). Company detail returns score
+ breakdown + initiative + 4 services + evidence + jobs. `POST /api/companies/:id/outreach`
produced a personalized draft ("Enhancing Your S/4HANA and Cloud Capabilities") referencing
CGI's observed hiring. Outreach list/edit/copy/delete + status (draft/sent/done) verified.

---

# PHASE 4 — Auth, Hardening & Production Deployment
**Goal:** Shippable to users.

## 4.1 Auth (light)
- Email/password, httpOnly session cookie, roles `ADMIN`/`SALES`; frontend middleware + API guards.

## 4.2 Reliability & cost control
- Rate limiting; AI budget guard (max daily OpenAI analyses, batching, retry/backoff, dead-letter).
- Idempotent workers, graceful shutdown, per-run retries.

## 4.3 Tests & seeds
- Unit: company normalization/resolution, jobHash dedup, qualification, scoring formula.
- Integration: fixture run → canonical jobs → company score → outreach.
- Realistic seed data (multi-source, multi-keyword) for staging/demos.

## 4.4 Deployment (confirmed target)
- **Worker + API** on Railway/Fly; worker image **Python-capable** (installs `scraper/requirements.txt` + Playwright browsers) so `country-scrape` jobs run there.
- Managed Postgres + Redis (TLS); frontend on Vercel.
- CI: typecheck → lint → test → build → `prisma migrate deploy`; scheduled-job config via env.
- Monitoring: Sentry, uptime, OpenAI spend; README runbook + complete `.env.example`.

## ✅ Phase 4 Exit Criteria
- [ ] Auth-gated app in staging; scheduled pipeline (LinkedIn + country sources) runs unattended.
- [ ] CI green; seeded demo env; runbook written.

---

## Execution Order

```
Phase 1 (integrate + schedule) → Phase 2 (intelligence + scoring)
    → Phase 3 (outreach + company views) → Phase 4 (auth + deploy)
```

Each phase ends deployable. Phases 1–2 are backend + admin-lean; Phase 3 is the user-facing product; Phase 4 makes it production-ready.