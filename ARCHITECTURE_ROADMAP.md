# SAP Demand Intelligence Platform — Architecture vs Reality

Roadmap mapping the **senior architecture** (Whimsical) against what is implemented in HireIntel / JobTool today, what remains future work, and what is worth adding beyond the diagram.

---

## Where we are vs the diagram

| Layer | Architecture | Today |
|-------|--------------|-------|
| UI | Dashboard, Jobs, Companies, Opportunities, Outreach | Dashboard, Jobs, Companies, Opportunities, **Outreach**, Sources |
| API | Auth, Campaigns, Search, Scoring, Opportunities | Search, Jobs, Companies, Stats, Scrape-country, Opportunities, Pitches. **Auth deferred** (internal tool). |
| Sources | Apify, Job APIs, Career pages, future | Apify (LinkedIn) + ~23 Europe Playwright sites |
| Queue / orchestration | Scheduler + Job Queue + retries / rate limits | BullMQ for LinkedIn + AI + **Europe scrape** + **24h scheduler** |
| Data | Raw store, normalize, dedup, entity resolution | `raw_jobs` / `clean_jobs`; job upsert only; companies are free-text names |
| Intelligence | Filter → Job AI → Company AI → Opportunity → Pitch | Filter + Job AI + Company AI + Opportunity Engine + **AI Pitch**; feedback still future |
| Feedback | Reviewed → contacted → won/lost → scoring calibration | **Feedback loop implemented** (events + pipeline). Scoring calibration still future. |
| Stores | Postgres + Vector + Redis | Postgres + Redis-as-queue; **no vector store** |

**Bottom line:** Core demand-intel pipeline through **pitch + feedback** works. Next gaps: **scoring calibration** from outcomes, entity-resolved Companies. Auth is **deferred** while this stays an internal tool.

---

## Component status (code-backed)

| # | Component | Status | Notes |
|---|-----------|--------|-------|
| 1 | Presentation (Next.js) | **Implemented** | Dashboard, Jobs, Companies, Opportunities, Outreach, Sources. Auth UI **deferred** (internal tool). |
| 2 | Application API / BFF | **Implemented** | Search, jobs, companies, stats, scrape-country, opportunities, pitches. Auth / campaigns **deferred** for internal use. |
| 3 | Feedback loop | **Implemented** | `feedback_events` + outcomes REVIEWED→CONTACTED→REPLIED→MEETING→WON/LOST; Opportunities UI + Feedback page. Scoring calibration still future. |
| 4 | Scheduler / Orchestrator | **Implemented** | BullMQ `scheduler` repeatable every 24h → LinkedIn (`ingestion`) + working Europe sites (`europe-scrape`). Env: `SCHEDULER_*`. |
| 5 | Job Queue | **Implemented** | BullMQ `ingestion` + `ai-classify` + `europe-scrape` + `scheduler`; retries, backoff, concurrency 1. |
| 6 | Source connectors | **Partial** | Apify LinkedIn + Europe Playwright. No career pages / generic job APIs. |
| 7 | Raw data store | **Partial** | `RawJob` in Postgres. No full source payload JSON / crawl metadata. |
| 8 | Normalization | **Partial** | Field mapping into `CleanJob`. No dedicated canonical Job/Company models. |
| 9 | Dedup + entity resolution | **Partial** | Job upsert `(jobId, country)` + soft skip same `company+title+country`. No company fuzzy match / aliases. |
| 10 | Deterministic filtering | **Partial** | Keyword taxonomy (LinkedIn). Europe scrapes skip filter. Freshness only on Apify. |
| 11 | AI Job Intelligence | **Partial** | `gpt-4o-mini` → confidence + reason. `is_primary` not persisted. |
| 12 | Company Aggregation | **Partial** | SQL `GROUP BY companyName`. No `Company` table / historical signals. |
| 13 | AI Company Intelligence | **Implemented** | Re-scores at most every `COMPANY_INTEL_REFRESH_DAYS` (default 3) when new jobs or relevance drift; daily stale scan in scheduler. |
| 14 | Opportunity Engine | **Implemented** | `opportunities` table: rank, stages (NEW→QUALIFIED/NURTURE/…), recommended offering codes; sync from company AI. |
| 15 | AI Pitch Generator | **Implemented** | `pitches` table + `ai-pitch` queue: angles, email subject/body, personalization, CTA; Outreach UI. |
| 16 | Stores | **Partial** | Postgres yes. Redis = queue only. Vector / embeddings = none. |

---

## Implemented (keep / harden)

1. **LinkedIn via Apify** — `POST /api/search` → BullMQ `ingestion` → poll → ingest  
2. **Europe Playwright scrapers** — ~23 working, ~16 honest `bot_blocked` (see `backend/scraper/SITES_STATUS.md`)  
3. **Shared ingest** — `raw_jobs` → `clean_jobs`  
4. **Deterministic filter** — SAP / ERP / Cloud / Data keep-exclude (LinkedIn path)  
5. **AI Job Intelligence (v1)** — confidence + `aiReason`  
6. **BullMQ + Redis** — `ingestion` + `ai-classify` with retries / backpressure  
7. **UI** — Dashboard, Jobs (region tree), Companies (avg confidence), Sources  

This covers roughly the left half of the processing pipeline through “candidate / relevant jobs.”

### Key files

| Area | Path |
|------|------|
| Pipeline docs | `backend/PIPELINE.md` |
| Scraper CLI | `backend/scraper/scrape.py` |
| Per-site scrapers | `backend/scraper/sites/*.py` |
| Europe scrape API | `backend/src/routes/scrape-country.ts` |
| Apify | `backend/src/services/apify.service.ts` |
| Ingest | `backend/src/services/ingest.service.ts` |
| Filter | `backend/src/services/filter.service.ts` |
| Job AI | `backend/src/services/ai-classifier.service.ts` |
| Queues | `backend/src/lib/queue.ts` |
| Schema | `backend/prisma/schema.prisma` (`RawJob`, `CleanJob`, `CompanyIntelligence`, `Opportunity`) |
| Region tree UI | `frontend/lib/regions.ts` |

---

## Future work (from senior architecture)

Ordered by dependency — build in this sequence.

### Phase A — Foundation

- Canonical **Company** model + entity resolution (same company across LinkedIn + Europe)
- **Raw payload + crawl metadata** store (full JSON, source, run id, scrapedAt)
- ~~**Scheduler / orchestrator** — recurring country + LinkedIn scans~~ **Done** (BullMQ every 24h)
- ~~Move Europe scrapes onto **BullMQ**~~ **Done** for scheduled path (`europe-scrape` queue); manual UI still runs in API for live status
- Persist `is_primary` from the job classifier

### Phase B — Company & opportunity intelligence

- ~~**Company Aggregation** — roll up jobs~~ (partial: SQL + AI roll-up)
- ~~**AI Company Intelligence** — opportunity score, “why now”, “what to sell”~~ **Done**
- ~~**Opportunity Engine** — rank, stage, recommended offering~~ **Done** (`opportunities`, `/api/opportunities`)
- UI: ~~**Opportunities** page~~ **Done**

### Phase C — Go-to-market loop

- ~~**AI Pitch Generator** — angles + email drafts + personalization~~ **Done**
- ~~UI: **Outreach**~~ **Done**
- ~~**Feedback loop** — reviewed / contacted / replied / meeting / won-lost~~ **Done**
- **Scoring calibration** from outcomes (dashed “future” line on the architecture)

### Phase D — Scale sources & retrieval

- Career-page crawlers + more job APIs
- Proxies / stealth for blocked Europe markets (DE, PL, NL, …)
- **Vector store** — semantic dedup + similar-job / similar-company search
- **Auth / campaigns / multi-user** — **deferred** while HireIntel stays an internal tool (VPN/localhost). Add when exposing beyond the team or needing audit trails.

---

## Worth adding (beyond the current diagram)

| Idea | Why |
|------|-----|
| **Scan / CrawlRun entity** | Every “create scan” needs audit: what ran, cost, items, errors |
| **Source health dashboard** | Which of ~39 Europe sites are alive this week |
| **Freshness SLAs** | Architecture mentions freshness; only Apify has a time window today |
| **Human review queue** | Approve / reject high-confidence leads before pitch / outreach |
| **CRM export** (HubSpot / Salesforce) | Close the loop outside the app |
| **Change detection** | “New SAP role at company X this week” alerts |
| **Cost / rate governance** | OpenAI + Apify spend caps per scan |
| **Apply filter to Europe** | Or a lighter taxonomy — Europe currently skips domain filter |

---

## Suggested 90-day focus

| Window | Focus |
|--------|--------|
| **Now** | Harden scrapers + entity-resolved Companies + richer job AI fields. Companies page becomes real “Company Intelligence,” not just an average. |
| **Next** | Opportunity model + ranking + Opportunities UI. First jump from “job search tool” to “demand intelligence.” |
| **Then** | Pitch + outreach + feedback. Scoring calibration only makes sense once opportunities exist. |

---

## Data model today vs target

**Today (Prisma)**

- `RawJob` → `raw_jobs`
- `CleanJob` → `clean_jobs` (`AiStatus`: PENDING → PROCESSING → DONE / FAILED)
- `CompanyIntelligence` → `company_intelligence` (opportunity score, why now, what to sell)
- `Opportunity` → `opportunities` (rank, stage, recommended offering)
- `Pitch` → `pitches` (angles, email, personalization)

**Target (architecture)**

- Companies, Jobs, Scores, Signals, Opportunities, Outreach
- Vector embeddings for semantic duplicate / similarity
- Redis for cache + locks + rate limits (not only queues)
- Feedback / outcome labels feeding future scoring calibration

---

## Related docs

- `backend/PIPELINE.md` — as-built LinkedIn + Europe pipeline
- `backend/scraper/SITES_STATUS.md` — working vs anti-bot Europe sites
- `PLAN.md` — original MVP plan (partially stale vs current code)
