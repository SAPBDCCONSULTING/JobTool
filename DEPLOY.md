# Deployment Guide

This app ships as **3 services**:

| Service | What | Where |
|---|---|---|
| PostgreSQL + Redis | Data + queue | Managed (Render, Neon, Upstash, …) |
| Backend (API + all 7 workers, one container) | Express API + BullMQ workers + Python/Playwright scrapers | Render **Docker** service |
| Frontend | Next.js UI | Vercel |

> The backend runs the HTTP API **and** all background workers in a **single process**
> (`dist/main.js`). No separate worker service is needed.

---

## Prerequisites

1. Code pushed to a **GitHub** repo.
2. Accounts on **Render** (or Railway) and **Vercel**.
3. Two keys: `OPENAI_API_KEY` and `APIFY_API_TOKEN`.

---

## Step 1 — Create PostgreSQL

- **Where:** Render → New → **PostgreSQL** (alternatives: Neon, Supabase).
- Copy the **Internal Database URL** (`postgresql://user:pass@host/db`). → this is `DATABASE_URL`.

## Step 2 — Create Redis

- **Where:** Render → New → **Redis** (alternative: Upstash).
- Copy the **Redis URL** (`redis://…` or `rediss://…`). → this is `REDIS_URL`.

---

## Step 3 — Deploy the Backend (Docker)

- **Where:** Render → New → **Web Service** → connect your repo.
- **Runtime:** **Docker** ⚠️ (not native Node — the image needs Python + Playwright for the
  country scrapers).
- **Root Directory:** `backend`
- **Dockerfile path:** `./Dockerfile` (Render auto-detects it)
- **Health check path:** `/health`

The Dockerfile runs migrations (`prisma migrate deploy`) then boots the app, so you don't
set a manual build/start command.

### Environment variables

Required:

```
DATABASE_URL       ← from Step 1
REDIS_URL          ← from Step 2
OPENAI_API_KEY     ← your key
APIFY_API_TOKEN    ← your key
NODE_ENV           = production
```

Optional (defaults are sensible — set only if you want to change behaviour):

```
PORT                        default 4000
APIFY_ACTOR_ID              default 2rJKkhh7vjpX7pvjg
APIFY_MAX_ITEMS             default 150
SCRAPER_PYTHON              default venv/bin/python3   (path inside the image)
SCHEDULER_CRON_PATTERN      default */15 * * * *
COUNTRY_SCRAPE_CONCURRENCY  default 2
MIN_JOB_RELEVANCE           default 40
JOB_STALE_DAYS              default 14
SCORE_WEIGHT_RELEVANCE      default 30
SCORE_WEIGHT_VOLUME         default 25
SCORE_WEIGHT_VELOCITY       default 25
SCORE_WEIGHT_OUTSOURCING    default 20
```

After deploy it gives you a URL, e.g. `https://jobtool-api.onrender.com`. Save this.

---

## Step 4 — Deploy the Frontend

- **Where:** Vercel → **Add New Project** → import your repo.
- **Root Directory:** `frontend`
- Framework: Next.js (auto-detected), build command `npm run build` (default).

### Environment variables

```
NEXT_PUBLIC_API_URL       = https://jobtool-api.onrender.com
NEXT_PUBLIC_USE_DEMO_DATA = false
```

> ⚠️ `NEXT_PUBLIC_USE_DEMO_DATA` **must be `false`**, otherwise the UI shows fake data
> instead of hitting your API.

---

## Step 5 — Verify

1. Open `https://<your-frontend>.vercel.app` → should load real data.
2. **Keywords** → add `SAP` → **Run now**.
3. **Runs** → a LinkedIn/country run should appear and progress.
4. **Companies** → scores populate as the AI pipeline processes the jobs.

---

## Gotchas

| Issue | Fix |
|---|---|
| **Render free tier sleeps** after ~15 min inactivity → scheduler misses runs | Use a paid instance (~$7/mo) or Railway/Fly always-on tier |
| Country scrapes fail if Python/Playwright missing | Already handled — the Dockerfile installs Python + Chromium |
| Frontend shows demo data | Set `NEXT_PUBLIC_USE_DEMO_DATA=false` |
| CORS blocks frontend calls | `cors.origin: '*'` is fine for now; tighten to your Vercel domain before public launch |
| API is unauthenticated | Add auth before sharing beyond yourself (see roadmap) |

---

## Local development (for reference)

```bash
# Infrastructure
docker compose up -d postgres redis        # ports 5434 / 6380

# Backend (all-in-one: API + workers)
cd backend && npm run dev:all              # or split: npm run dev  +  npm run dev:worker

# Frontend
cd frontend && npm run dev                 # http://localhost:3000
```
