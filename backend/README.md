# Backend — HireIntel API & Worker

Node.js + Express + Prisma + BullMQ + OpenAI Agents SDK

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + Redis)

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create env file**
```bash
cp ../.env.example .env
```

Fill in these values in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/jobtool
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=2rJKkhh7vjpX7pvjg
PORT=4000
NODE_ENV=development
```

**3. Start infrastructure**
```bash
# From the project root
docker compose up -d postgres redis
```

**4. Run database migrations**
```bash
npm run db:migrate
npm run db:generate
```

## Troubleshooting

### `P1012 Environment variable not found: DATABASE_URL`
Prisma only auto-loads `.env` from the current project directory.

From `backend/`, ensure this file exists:

```bash
cp ../.env.example .env
```

And confirm `.env` contains:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/jobtool
```

### `P1000 Authentication failed`
This usually means either:
1) the DB is not the expected Docker Postgres instance, or
2) credentials in `.env` do not match the running container.

Run from the project root:

```bash
docker compose up -d postgres
docker compose ps
```

If you already have another Postgres on `5432`, this project maps Postgres to host port `5433`.

If credentials still fail, recreate Postgres volume (destructive):

```bash
docker compose down -v
docker compose up -d postgres redis
```

Then rerun:

```bash
npm run db:migrate
```

## Running

Open two terminals:

```bash
# Terminal 1 — API server (port 4000)
npm run dev

# Terminal 2 — Background worker (Apify + AI processing)
npm run dev:worker
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API server with hot reload |
| `npm run dev:worker` | Start BullMQ workers with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled API server |
| `npm run start:worker` | Run compiled worker |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio (DB browser) |
| `npm run db:reset` | Reset database (destructive) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/search` | Trigger job search `{ keyword, location }` |
| `GET` | `/api/jobs` | List jobs with filters + pagination |
| `GET` | `/api/companies` | Company aggregations sorted by confidence |
| `GET` | `/api/stats` | Dashboard stats |

### Job filters (query params)
`country`, `domain`, `companyName`, `aiStatus`, `minConfidence`, `page`, `limit`

## Architecture

```
POST /api/search
  → BullMQ ingestion queue
    → Apify actor run (2rJKkhh7vjpX7pvjg)
    → Rule-based filter (SAP/ERP/Cloud/Data)
    → raw_jobs + clean_jobs (PENDING)
    → BullMQ ai-classify queue
      → OpenAI classification (gpt-4o-mini)
      → clean_jobs (DONE)
```

The worker process runs completely separately from the HTTP server — AI is never called inside an API route.
