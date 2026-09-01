# HireIntel — scraping & classification process

How LinkedIn and Europe jobs are found, ingested, classified, and shown in the UI.

---

## Overview

Two scrape paths share one ingest → classify → UI pipeline.

```
┌──────────────────────────┐   ┌─────────────────────────────┐
│  LinkedIn (Apify)        │   │  Europe sites (Playwright)  │
│  Dashboard SearchForm    │   │  Jobs → region tree         │
│  POST /api/search        │   │  POST /api/scrape-country   │
└────────────┬─────────────┘   └──────────────┬──────────────┘
             │                                │
             ▼                                ▼
      BullMQ `ingestion`              Spawn scrape.py
      → Apify actor poll              → per-site scrapers
             │                                │
             └────────────┬───────────────────┘
                          ▼
                 processRawItems()
                          │
              raw_jobs → (filter) → clean_jobs (PENDING)
                          │
                 BullMQ `ai-classify`
                          │
              clean_jobs (DONE + confidence)
                          │
                    Jobs / Dashboard UI
```

---

## 1. LinkedIn jobs (Apify)

| Step | What happens |
|------|----------------|
| 1 | User enters keyword + location in **Search** (dashboard) |
| 2 | `POST /api/search` enqueues a BullMQ job on queue `ingestion` |
| 3 | Worker (`npm run dev:worker`) runs `ingestJobs()` |
| 4 | Starts Apify actor (`APIFY_ACTOR_ID`, default LinkedIn jobs actor) |
| 5 | **Polls** every 5s (max ~5 min) — **no webhook** |
| 6 | Pulls up to 200 items from the Apify dataset |
| 7 | Items go into `processRawItems()` |

**Apify is only used for LinkedIn**, not for Europe country sites.

### Actor input (typical)

- `keyword`, `location`
- `maxItems: 150`
- `enrichCompanyData: true`
- `saveOnlyUniqueItems: true`

### Key files

| File | Role |
|------|------|
| `backend/src/routes/search.ts` | Queue Apify search |
| `backend/src/services/apify.service.ts` | Trigger / poll / fetch dataset |
| `backend/src/workers/ingestion.worker.ts` | Runs Apify ingest |
| `frontend/components/search/SearchForm.tsx` | LinkedIn search UI |

---

## 2. Europe jobs (Playwright scrapers)

| Step | What happens |
|------|----------------|
| 1 | User picks **Europe → Country → Website** + keyword on Jobs |
| 2 | `POST /api/scrape-country` returns immediately (`queued`) |
| 3 | Spawns `python scrape.py --website … --keyword … --country …` |
| 4 | Playwright opens the site: dedicated scraper in `sites/`, else generic |
| 5 | stdout JSON (same shape as Apify items) |
| 6 | `processRawItems(..., { skipFilter: true })` |
| 7 | Progress via `GET /api/scrape-country/status` |

Phases: `scraping` → `processing` → `classifying` → `done` / `error`.

Anti-bot sites raise `bot_blocked` instead of a fake empty result.

### Key files

| File | Role |
|------|------|
| `backend/src/routes/scrape-country.ts` | Spawn scraper + status map |
| `backend/scraper/scrape.py` | Playwright CLI entry |
| `backend/scraper/sites/*.py` | One scraper per country/website |
| `backend/scraper/SITES_STATUS.md` | Working vs anti-bot sites |
| `frontend/lib/regions.ts` | Europe → country → website tree |

---

## 3. Shared ingest (`processRawItems`)

Used by both Apify and country scrapers.

| Step | Detail |
|------|--------|
| 1 | Upsert into **`raw_jobs`** (by job id + country) |
| 2 | **Rule filter** (SAP / ERP / Cloud / Data; drop HR/sales noise) |
| 3 | Matching rows → **`clean_jobs`** with `aiStatus = PENDING` |
| 4 | Enqueue BullMQ `ai-classify` |

**Filter behavior**

| Path | Filter |
|------|--------|
| LinkedIn / Apify | **On** — only domain-relevant jobs become clean |
| Europe country scrapes | **Skipped** (`skipFilter: true`) — all scraped jobs go to clean |

Key file: `backend/src/services/ingest.service.ts`  
Filter rules: `backend/src/services/filter.service.ts`

---

## 4. AI classification

| Step | Detail |
|------|--------|
| 1 | Worker pulls `clean_jobs` where `aiStatus = PENDING` (batches of 10) |
| 2 | OpenAI (`gpt-4o-mini`) classifies hiring intent |
| 3 | Saves `confidence`, `aiReason`, `aiStatus = DONE` (or `FAILED`) |
| 4 | Jobs UI / company rankings use classified rows |

Key files:

| File | Role |
|------|------|
| `backend/src/services/ai-classifier.service.ts` | OpenAI classifier |
| `backend/src/workers/ai-classify.worker.ts` | Batch worker |
| `backend/src/lib/queue.ts` | Queues: `ingestion`, `ai-classify` |

---

## 5. What must be running

| Process | Command | Role |
|---------|---------|------|
| API | `npm run dev` (backend) | HTTP + Europe Playwright scrapes |
| Worker | `npm run dev:worker` | Apify LinkedIn ingest + all AI classify |
| Postgres + Redis | `docker compose up -d` | DB + BullMQ |

Env (see `backend/README.md`):

- `DATABASE_URL`, `REDIS_URL`
- `OPENAI_API_KEY`
- `APIFY_API_TOKEN`, `APIFY_ACTOR_ID`

---

## 6. Short version

| Source | How |
|--------|-----|
| **LinkedIn** | Apify actor → poll → ingest → filter → AI |
| **Europe** | Python site scrapers → ingest (no domain filter) → AI |
| **Classify** | Same AI queue for both → Jobs / Dashboard |

---

## Data tables

| Table | Purpose |
|-------|---------|
| `raw_jobs` | Every scraped item (Apify or country) |
| `clean_jobs` | Filtered / accepted jobs + AI status |

UI reads mainly from `clean_jobs` via `GET /api/jobs` and dashboard stats via `GET /api/stats`.

---

## 7. What is working today

| Piece | Status |
|-------|--------|
| LinkedIn via Apify | Works when `APIFY_API_TOKEN` + worker are running |
| Europe scrapers | **~23 sites** return jobs (reed, jobs.cz, jobindex, tyomarkkinatori, francetravail, alfred, mojposao.ba, …) |
| Anti-bot Europe sites | **~16 sites** correctly report blocked/closed (not fake empty) — see `scraper/SITES_STATUS.md` |
| Ingest → `raw_jobs` / `clean_jobs` | Works for both paths |
| AI classify | Works when worker + `OPENAI_API_KEY` are running |
| Jobs / Dashboard UI | Shows classified `clean_jobs` |

**Not working without worker:** LinkedIn search stays queued; AI stays `PENDING`.  
**Europe scrapes** run in the API process (no BullMQ for scrape itself), but still need the worker for AI classify.

---

## 8. Why BullMQ + Redis workers?

Scraping and AI are **slow and unreliable** if done inside the HTTP request. Redis + BullMQ turn them into background jobs.

| Problem | Without queue | With BullMQ/Redis |
|---------|---------------|-------------------|
| Apify run takes 1–5 minutes | HTTP request times out / browser hangs | API returns immediately; worker polls Apify |
| OpenAI rate limits / cost | Classify 100 jobs in one request → fail | Batches of 10, concurrency 1, backoff |
| Crash mid-run | Work lost | Job retries (**3 attempts**, exponential backoff) |
| Multiple users search at once | Overload Apify / OpenAI | Queue serializes ingestion (`concurrency: 1`) |
| API vs heavy work | One process does everything | API stays light; worker does Apify + AI |

### Two queues

| Queue | Triggered by | Worker does |
|-------|--------------|-------------|
| `ingestion` | `POST /api/search` (LinkedIn) | Apify trigger → poll → fetch → `processRawItems` |
| `ai-classify` | After ingest (LinkedIn **and** Europe) | Classify PENDING `clean_jobs` with OpenAI |

Redis stores the queue state (waiting / active / failed jobs). BullMQ is the Node library on top of Redis.

### Why Europe scrape is *not* on BullMQ

Country scrape is spawned directly from the API (`scrape-country.ts`) so the UI can poll live status (`scraping` → `processing` → …).  
Only the **AI step** after that uses the `ai-classify` queue.

### Mental model

```
User clicks Search (LinkedIn)
        │
        ▼
   API enqueues job in Redis (BullMQ)
        │
        ▼ returns "queued" to UI immediately
        │
   Worker process picks job
        │
        ▼ Apify (minutes) → DB → enqueue AI jobs
        │
   Same worker classifies in batches
```

---

## 9. How the AI classifier works

After jobs land in `clean_jobs` with `aiStatus = PENDING`, a background worker scores each one for **hiring intent** (is this company actively investing in SAP / ERP / Cloud / Data?).

### Flow

```
clean_jobs (PENDING)
        │
        ▼
BullMQ queue `ai-classify`  (triggered after ingest)
        │
        ▼
Worker claims batch of 10  (FOR UPDATE SKIP LOCKED)
        │  aiStatus → PROCESSING
        ▼
For each job → OpenAI Agents SDK (gpt-4o-mini)
        │
        ├─ success → DONE + confidence + aiReason
        └─ error   → FAILED
        │
        ▼
If batch was full (10) → chain next batch after 500ms
```

### What the model receives

From each `clean_job`:

- company name  
- job title  
- job description (first **3000** chars)

### What the model returns (JSON)

| Field | Meaning |
|-------|---------|
| `is_primary` | `true` = hands-on tech/leadership role (architect, consultant, developer…). `false` = sales/support/training/peripheral |
| `confidence` | 0.0–1.0 how strongly the job signals real tech investment |
| `reason` | 1–2 sentence explanation |

**Confidence guide (in the prompt):**

| Range | Meaning |
|-------|---------|
| 0.9–1.0 | Direct implementation (e.g. SAP S/4HANA Lead) |
| 0.7–0.89 | Strong signal (ERP PM, Data Engineer on new platform) |
| 0.5–0.69 | Moderate |
| 0.3–0.49 | Weak |
| 0.0–0.29 | No meaningful signal |

### What gets saved in the DB

| Column | Saved? |
|--------|--------|
| `confidence` | Yes |
| `aiReason` | Yes (`reason`) |
| `aiStatus` | `DONE` / `FAILED` |
| `aiProcessedAt` | Yes |
| `is_primary` | **No** — returned by the model but not persisted today |

### Why batching + queue

- OpenAI calls are slow/rate-limited → **1 batch at a time**, **10 jobs per batch**
- `FOR UPDATE SKIP LOCKED` so two workers don’t classify the same row
- Retries via BullMQ (3 attempts) if the worker/job fails
- Chaining keeps draining PENDING until empty

### Where you see it in the UI

- Jobs table: AI status + confidence filter  
- Dashboard: counts of DONE / high-confidence (≥ 0.7) / still pending  
- Companies: ranked by **average confidence** of DONE jobs  

### Key files

| File | Role |
|------|------|
| `backend/src/services/ai-classifier.service.ts` | Agent prompt + `classifyJob()` |
| `backend/src/workers/ai-classify.worker.ts` | Batch claim → classify → update DB |
| `backend/src/services/ingest.service.ts` | Enqueues `ai-classify` after insert |
| `backend/prisma/schema.prisma` | `AiStatus`: PENDING → PROCESSING → DONE / FAILED |

Needs: Redis + `npm run dev:worker` + `OPENAI_API_KEY`.

---

## 10. How Europe country scrapers work

Europe jobs are **not** from Apify. Each country/website has (or should have) its own Playwright scraper.

### UI → API

1. User opens **Jobs**, picks region tree: `Europe → Country → Website` (`frontend/lib/regions.ts`)
2. Enters keyword → **Start Scraping**
3. Frontend calls `POST /api/scrape-country` with `{ country, website, keyword }`
4. API responds immediately with `status: queued` and starts scraping in the background
5. UI polls `GET /api/scrape-country/status` for phases

### What the API does

`backend/src/routes/scrape-country.ts`:

1. Spawns Python:
   ```bash
   scraper/venv/bin/python3 scrape.py \
     --website "<site url>" \
     --keyword "<keyword>" \
     --country "<country>"
   ```
2. Reads JSON from stdout
3. On success → `processRawItems(items, keyword, country, { skipFilter: true })`
4. On `bot_blocked` → status `error` with clear message (not “No jobs found”)

Phases: `scraping` → `processing` → `classifying` → `done` / `error`

### What `scrape.py` does

1. Opens headless Chromium (Playwright)
2. Looks up a **dedicated scraper** by website domain:
   - `get_parser(website)` → `sites.get_site_scraper(host)`
3. If found → `await site.scrape(page, keyword)`
4. If not found → `generic_scrape()` (search box heuristics)
5. Normalizes titles/companies/URLs, optional translate to English
6. Prints JSON array to stdout (same shape as Apify items)

### Per-site scrapers (`backend/scraper/sites/`)

One file per site, named like `finland_tyomarkkinatori.py`:

```python
COUNTRY = "Finland"
DOMAIN = "tyomarkkinatori.fi"
ALIASES = ["te-palvelut.fi"]   # optional

async def scrape(page, keyword) -> list[dict]:
    # goto correct search URL, dismiss cookies, extract cards
    return [job(title, url, company, location), ...]
```

`sites/__init__.py` **auto-registers** every module that has `DOMAIN` + `scrape`.  
Aliases map old domains (e.g. `te-palvelut.fi`) to the same scraper.

Blocked sites either:

- live in `_blocked.py`, or  
- raise `BotBlockedError` inside their own file (Cloudflare / login)

### Example: Finland

| Step | Detail |
|------|--------|
| UI site | `tyomarkkinatori.fi` |
| Scraper | `sites/finland_tyomarkkinatori.py` |
| Search URL | `https://tyomarkkinatori.fi/en/personal-customers/vacancies?q={keyword}` |
| Extract | Job links with UUID → title, company, location |
| Result | e.g. 25 jobs for `sap` |

### After scrape (same as LinkedIn path from here)

```
JSON jobs
   → raw_jobs
   → clean_jobs (PENDING)   # skipFilter=true — no SAP regex gate
   → BullMQ ai-classify
   → DONE + confidence
   → Jobs table
```

### Working vs blocked

See **`backend/scraper/SITES_STATUS.md`**:

- **~23 working** — dedicated URL + selectors return jobs  
- **~16 anti-bot/closed** — Cloudflare, login, or site shut down  

### Key difference vs LinkedIn

| | LinkedIn | Europe |
|--|----------|--------|
| Tool | Apify actor | Playwright + your Python files |
| Queue for scrape | BullMQ `ingestion` | No — spawned from API |
| Domain filter | Yes (SAP/ERP/Cloud/Data) | Skipped |
| AI classify | Yes (same queue) | Yes (same queue) |
