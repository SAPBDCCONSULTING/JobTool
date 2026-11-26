# HireIntel — Hiring Intent Intelligence Platform

An AI-powered tool that fetches recent jobs for configured keywords (e.g. `SAP`, `SAC`), filters
them to SAP/ERP/Cloud/Data roles, groups them by company, scores each company (opportunity fit),
and generates outreach emails — so sales can see *which companies to pitch and why*.

## Architecture (3 services)

| Service | Tech | What it does |
|---|---|---|
| **Frontend** (`frontend/`) | Next.js + React 19 + Tailwind | Dashboard, Companies, Jobs, Keywords, Sources, Runs, Outreach |
| **Backend** (`backend/`) | Express + Prisma + BullMQ | `/api/*` REST API — reads DB, enqueues work |
| **Workers** (same `backend/` process via `main.ts`) | BullMQ + OpenAI + Playwright | 7 background workers (fetch, scrape, AI classify, company intel, lifecycle, enrich) |

Plus **PostgreSQL** (data) and **Redis** (BullMQ queue backend) — both managed.

> The API and all workers run in **one process** (`backend/src/main.ts`) in production.
> See `DEPLOY.md` for how this maps to hosting.

## Pipeline (simplified)

```
Keyword × Source  ──scheduler / manual trigger──►  source-fetch (LinkedIn/Apify)
                                                     country-scrape (Python/Playwright)
        └────────────►  normalize → filter → dedup (canonical job)  ─────────────┘
                              │
              AI classify (relevance, tech, role, outsourcing)
                              │
              company-intel (opportunity score + "why" + initiative)
                              │
              outreach emails  ──►  shown in the dashboard
```

## Repo layout

```
frontend/        Next.js app (pages under app/, components under components/)
backend/src/     Express API + workers (routes/, workers/, services/, lib/)
backend/prisma/  Database schema + migrations
backend/scraper/ Python + Playwright per-site scrapers (sites/*.py, auto-registered)
```

## Quick start (local)

```bash
# 1. Infrastructure (Postgres :5434, Redis :6380)
docker compose up -d postgres redis

# 2. Backend (API + workers in one process)
cd backend && cp ../.env.example .env   # fill in keys
npm install && npx prisma migrate dev
npm run dev:all                          # or split: npm run dev + npm run dev:worker

# 3. Frontend
cd frontend && cp ../.env.example .env.local
npm install && npm run dev                # http://localhost:3000
```

## Docs

- **[`DEPLOY.md`](DEPLOY.md)** — how to deploy (Vercel + Render + managed DB/Redis)
- **[`PRD.md`](PRD.md)** — product requirements
- [`backend/README.md`](backend/README.md) — backend setup
- [`backend/PIPELINE.md`](backend/PIPELINE.md) — detailed scrape→classify→UI process
- [`backend/scraper/SITES_STATUS.md`](backend/scraper/SITES_STATUS.md) — which job sites work vs. are bot-blocked
- [`frontend/README.md`](frontend/README.md) — frontend setup
