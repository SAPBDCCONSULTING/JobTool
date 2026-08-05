# Hiring Intent Intelligence Platform — Implementation Plan

## Context

Building an AI-powered platform that:
1. Fetches job postings via Apify on-demand
2. Applies rule-based filtering to keep only SAP/ERP/Cloud/Data roles
3. Runs AI classification in the background (non-blocking) via OpenAI Agents SDK
4. Displays results on a Next.js dashboard with company aggregation and confidence filtering

**Current state:** Fresh Next.js frontend (16.1.6, React 19, Tailwind v4) + bare backend (only package.json). No database, no Docker, no env files.

---

## Architecture

```
┌─────────────────┐    HTTP     ┌─────────────────────────────────────┐
│  Next.js (3000) │ ──────────► │  Express API (4000)                 │
│  App Router     │             │  POST /api/search → enqueue job     │
│  /dashboard     │             │  GET  /api/jobs   → query DB        │
│  /jobs          │             │  GET  /api/companies → aggregation  │
│  /companies     │             └─────────────┬───────────────────────┘
└─────────────────┘                           │ enqueue
                                              ▼
                                   ┌──────────────────┐
                                   │  Redis (BullMQ)  │
                                   │  ingestion-queue  │
                                   │  ai-queue        │
                                   └────────┬─────────┘
                                            │ process
                          ┌─────────────────┴──────────────────┐
                          │  Worker Process (worker.ts)         │
                          │  ingestion.worker → Apify → filter │
                          │    → raw_jobs → clean_jobs(PENDING) │
                          │  ai-classify.worker → OpenAI SDK   │
                          │    → clean_jobs(DONE/FAILED)        │
                          └────────────────────────────────────┘
                                            │
                                  ┌─────────▼──────────┐
                                  │  PostgreSQL (5432)  │
                                  │  raw_jobs          │
                                  │  clean_jobs        │
                                  └────────────────────┘
```

**Key constraint:** AI worker runs in a separate process (`worker.ts`), never inside an HTTP handler.

---

## Folder Structure

```
jobTool/
├── .env.example
├── docker-compose.yml
├── PLAN.md
│
├── frontend/                          # Existing Next.js app
│   ├── app/
│   │   ├── layout.tsx                 # UPDATE: add nav, metadata title
│   │   ├── page.tsx                   # UPDATE: redirect to /dashboard
│   │   ├── dashboard/page.tsx         # NEW: stats cards
│   │   ├── jobs/page.tsx              # NEW: jobs table + filters
│   │   └── companies/page.tsx         # NEW: companies aggregation table
│   ├── components/
│   │   ├── ui/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   └── Pagination.tsx
│   │   ├── jobs/
│   │   │   ├── JobFilters.tsx
│   │   │   └── JobsTable.tsx
│   │   ├── companies/
│   │   │   └── CompaniesTable.tsx
│   │   └── layout/
│   │       └── Sidebar.tsx
│   └── lib/
│       └── api.ts                     # Typed fetch wrappers for backend
│
└── backend/
    ├── package.json                   # Change type to "module", add all deps
    ├── tsconfig.json
    ├── Dockerfile                     # Runs Express API server
    ├── Dockerfile.worker              # Runs BullMQ worker process
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── index.ts                   # Express HTTP server entry
        ├── worker.ts                  # BullMQ workers entry (run separately)
        ├── config/
        │   └── env.ts                 # Validates all env vars (fail-fast on startup)
        ├── lib/
        │   ├── prisma.ts              # Singleton PrismaClient
        │   ├── redis.ts               # IORedis client for BullMQ
        │   ├── queue.ts               # BullMQ Queue definitions
        │   └── logger.ts              # Pino logger
        ├── routes/
        │   ├── index.ts               # Mounts all routers
        │   ├── search.ts              # POST /api/search
        │   ├── jobs.ts                # GET /api/jobs
        │   └── companies.ts           # GET /api/companies
        ├── services/
        │   ├── apify.service.ts       # Trigger actor + fetch dataset
        │   ├── filter.service.ts      # Rule-based relevance filter
        │   ├── ingest.service.ts      # Orchestrates: fetch → filter → upsert
        │   └── ai-classifier.service.ts  # OpenAI Agents SDK calls
        └── workers/
            ├── ingestion.worker.ts    # BullMQ: processes Apify ingestion jobs
            └── ai-classify.worker.ts  # BullMQ: processes AI classification batches
```

---

## Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AiStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}

model RawJob {
  id             String    @id @default(uuid())
  jobId          String
  jobTitle       String
  jobDescription String    @db.Text
  companyName    String
  companyId      String?
  companyUrl     String?
  location       String?
  country        String
  searchString   String
  source         String    @default("apify")
  publishedAt    DateTime?
  createdAt      DateTime  @default(now())

  cleanJob       CleanJob?

  @@unique([jobId, country])
  @@index([country])
  @@index([companyName])
  @@map("raw_jobs")
}

model CleanJob {
  id             String    @id @default(uuid())
  rawJobId       String    @unique
  rawJob         RawJob    @relation(fields: [rawJobId], references: [id])
  jobTitle       String
  jobDescription String    @db.Text
  companyName    String
  country        String
  domain         String?
  searchString   String
  aiStatus       AiStatus  @default(PENDING)
  confidence     Float?
  aiReason       String?   @db.Text
  createdAt      DateTime  @default(now())
  aiProcessedAt  DateTime?

  @@index([aiStatus])
  @@index([confidence])
  @@index([companyName])
  @@index([country])
  @@map("clean_jobs")
}
```

---

## Backend `package.json` Dependencies

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:worker": "tsx watch src/worker.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "start:worker": "node dist/worker.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@openai/agents": "latest",
    "@prisma/client": "^6",
    "bullmq": "^5",
    "cors": "^2",
    "express": "^5",
    "ioredis": "^5",
    "pino": "^9",
    "pino-pretty": "^13",
    "zod": "^3"
  },
  "devDependencies": {
    "@types/cors": "^2",
    "@types/express": "^5",
    "@types/node": "^20",
    "prisma": "^6",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```

---

## Frontend Additional Dependencies

Add to `frontend/package.json`:
```json
"@tanstack/react-query": "^5"
```
(For data fetching and cache management. Core UI uses Tailwind only — no chart library needed.)

---

## `.env.example`

```env
# ─── Database ───────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobtool

# ─── Redis ──────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── OpenAI ─────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── Apify ──────────────────────────────────────────────────
APIFY_API_TOKEN=apify_api_...
# Actor ID for job scraping (e.g. LinkedIn jobs scraper on Apify Store)
APIFY_ACTOR_ID=

# ─── Backend ─────────────────────────────────────────────────
PORT=4000
NODE_ENV=development

# ─── Frontend ────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: jobtool
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/jobtool
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      APIFY_API_TOKEN: ${APIFY_API_TOKEN}
      APIFY_ACTOR_ID: ${APIFY_ACTOR_ID}
      PORT: 4000
      NODE_ENV: production
    ports:
      - "4000:4000"

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/jobtool
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      APIFY_API_TOKEN: ${APIFY_API_TOKEN}
      APIFY_ACTOR_ID: ${APIFY_ACTOR_ID}
      NODE_ENV: production

volumes:
  postgres_data:
  redis_data:
```

> Two separate Dockerfiles: `Dockerfile` starts the Express API, `Dockerfile.worker` starts the BullMQ worker process.

---

## Key Implementation Details

### 1. `src/config/env.ts` — Fail-fast env validation
Use Zod to parse `process.env` at startup. Throw immediately if any required variable is missing.

### 2. `src/lib/queue.ts` — BullMQ Queues
```typescript
export const ingestionQueue = new Queue('ingestion', { connection: redis });
export const aiQueue = new Queue('ai-classify', { connection: redis });
```

### 3. `POST /api/search` — Non-blocking
```typescript
// Just enqueue, return immediately — no waiting for Apify or AI
await ingestionQueue.add('ingest', { keyword, country });
res.json({ status: 'queued' });
```

### 4. `services/apify.service.ts` — Apify Integration
- `POST https://api.apify.com/v2/acts/{actorId}/runs` with input `{ keyword, country }`
- Poll `GET /v2/actor-runs/{runId}` until `status === 'SUCCEEDED'`
- `GET /v2/datasets/{defaultDatasetId}/items?clean=true` to fetch results
- Deduplicate via Prisma `upsert` using `@@unique([jobId, country])`

### 5. `services/filter.service.ts` — Rule-Based Filter
```typescript
const KEEP_KEYWORDS = ['sap', 'erp', 'finance system', 'cloud', 'data', 'analytics', 'bi '];
const REMOVE_KEYWORDS = ['hr manager', 'sales', 'marketing', 'recruiter'];

function isRelevant(job: { jobTitle: string; jobDescription: string }): boolean {
  const text = `${job.jobTitle} ${job.jobDescription}`.toLowerCase();
  if (REMOVE_KEYWORDS.some(k => text.includes(k))) return false;
  return KEEP_KEYWORDS.some(k => text.includes(k));
}
```

### 6. `services/ai-classifier.service.ts` — OpenAI Agents SDK
```typescript
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

const ClassificationSchema = z.object({
  is_primary: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const classifierAgent = new Agent({
  name: 'JobClassifier',
  model: 'gpt-4o-mini',
  instructions: `You are a job relevance classifier for SAP/ERP/Cloud/Data hiring intent.
Analyze the job posting and return ONLY valid JSON with:
- is_primary: true if this is a primary tech/implementation role (not support/sales/HR)
- confidence: 0.0–1.0 score of relevance to SAP/ERP/Cloud/Data buying intent
- reason: 1–2 sentence explanation`,
});

export async function classifyJob(job: {
  jobTitle: string;
  jobDescription: string;
  companyName: string;
}) {
  const userMessage = `Company: ${job.companyName}\nTitle: ${job.jobTitle}\n\nDescription:\n${job.jobDescription.slice(0, 2000)}`;
  const result = await run(classifierAgent, userMessage);
  return ClassificationSchema.parse(JSON.parse(result.finalOutput ?? '{}'));
}
```

### 7. `workers/ai-classify.worker.ts` — Safe Batch Processing with Row Locking
```typescript
// FOR UPDATE SKIP LOCKED prevents duplicate processing across multiple worker instances
const jobs = await prisma.$queryRaw<CleanJob[]>`
  SELECT * FROM clean_jobs
  WHERE ai_status = 'PENDING'
  ORDER BY created_at ASC
  LIMIT 10
  FOR UPDATE SKIP LOCKED
`;

await prisma.cleanJob.updateMany({
  where: { id: { in: jobs.map(j => j.id) } },
  data: { aiStatus: 'PROCESSING' },
});

for (const job of jobs) {
  try {
    const result = await classifyJob(job);
    await prisma.cleanJob.update({
      where: { id: job.id },
      data: {
        aiStatus: 'DONE',
        confidence: result.confidence,
        aiReason: result.reason,
        aiProcessedAt: new Date(),
      },
    });
  } catch {
    await prisma.cleanJob.update({
      where: { id: job.id },
      data: { aiStatus: 'FAILED' },
    });
  }
}
```

Worker runs on a BullMQ repeatable job (every 30s) and also gets triggered directly by the ingestion worker after inserting clean jobs.

### 8. `GET /api/jobs` — Filters + Pagination
```typescript
const { country, minConfidence, domain, companyName, page = 1, limit = 20 } = req.query;
const jobs = await prisma.cleanJob.findMany({
  where: {
    ...(country      && { country: String(country) }),
    ...(minConfidence && { confidence: { gte: parseFloat(String(minConfidence)) } }),
    ...(domain       && { domain: String(domain) }),
    ...(companyName  && { companyName: { contains: String(companyName), mode: 'insensitive' } }),
  },
  orderBy: { createdAt: 'desc' },
  take: Number(limit),
  skip: (Number(page) - 1) * Number(limit),
});
```

### 9. `GET /api/companies` — Aggregation
```typescript
const companies = await prisma.cleanJob.groupBy({
  by: ['companyName', 'country'],
  _count: { id: true },
  _avg: { confidence: true },
  orderBy: { _avg: { confidence: 'desc' } },
});
```

---

## Implementation Order

### Phase 1 — Infrastructure
1. Create `.env.example` at project root
2. Create `docker-compose.yml` at project root
3. `docker compose up -d postgres redis`

### Phase 2 — Backend Bootstrap
4. Rewrite `backend/package.json` (ESM type, all deps, scripts)
5. Create `backend/tsconfig.json`
6. Create `backend/src/config/env.ts` (Zod validation)
7. Create `backend/src/lib/` — `prisma.ts`, `redis.ts`, `queue.ts`, `logger.ts`

### Phase 3 — Database
8. Create `backend/prisma/schema.prisma`
9. `npm run db:migrate` (first migration)
10. `npm run db:generate`

### Phase 4 — Services
11. `services/apify.service.ts`
12. `services/filter.service.ts`
13. `services/ingest.service.ts`
14. `services/ai-classifier.service.ts`

### Phase 5 — Workers
15. `workers/ingestion.worker.ts`
16. `workers/ai-classify.worker.ts`
17. `src/worker.ts` (starts both workers)

### Phase 6 — API Routes
18. `routes/search.ts`
19. `routes/jobs.ts`
20. `routes/companies.ts`
21. `src/index.ts` (Express server + CORS)

### Phase 7 — Frontend
22. `frontend/lib/api.ts` (typed fetch wrappers)
23. `frontend/app/dashboard/page.tsx`
24. `frontend/app/jobs/page.tsx`
25. `frontend/app/companies/page.tsx`
26. Shared components: `Sidebar`, `StatsCard`, `ConfidenceBadge`, `JobFilters`, `JobsTable`, `CompaniesTable`, `Pagination`
27. Update `frontend/app/layout.tsx` with sidebar nav

### Phase 8 — Docker (Production)
28. `backend/Dockerfile`
29. `backend/Dockerfile.worker`

---

## Local Dev Run Instructions

```bash
# 1. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 2. Backend — install, migrate, run
cd backend
cp ../.env.example .env        # then fill in OPENAI_API_KEY, APIFY_API_TOKEN, APIFY_ACTOR_ID
npm install
npm run db:migrate
npm run db:generate
npm run dev                    # Terminal 1: Express API on :4000

# 3. Worker (separate terminal)
npm run dev:worker             # Terminal 2: BullMQ workers

# 4. Frontend
cd ../frontend
# create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                    # Terminal 3: Next.js on :3000
```

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `.env.example` | CREATE at root |
| `docker-compose.yml` | CREATE at root |
| `backend/package.json` | MODIFY (type→module, add deps + scripts) |
| `backend/tsconfig.json` | CREATE |
| `backend/prisma/schema.prisma` | CREATE |
| `backend/src/config/env.ts` | CREATE |
| `backend/src/lib/prisma.ts` | CREATE |
| `backend/src/lib/redis.ts` | CREATE |
| `backend/src/lib/queue.ts` | CREATE |
| `backend/src/lib/logger.ts` | CREATE |
| `backend/src/routes/index.ts` | CREATE |
| `backend/src/routes/search.ts` | CREATE |
| `backend/src/routes/jobs.ts` | CREATE |
| `backend/src/routes/companies.ts` | CREATE |
| `backend/src/services/apify.service.ts` | CREATE |
| `backend/src/services/filter.service.ts` | CREATE |
| `backend/src/services/ingest.service.ts` | CREATE |
| `backend/src/services/ai-classifier.service.ts` | CREATE |
| `backend/src/workers/ingestion.worker.ts` | CREATE |
| `backend/src/workers/ai-classify.worker.ts` | CREATE |
| `backend/src/index.ts` | CREATE |
| `backend/src/worker.ts` | CREATE |
| `backend/Dockerfile` | CREATE |
| `backend/Dockerfile.worker` | CREATE |
| `frontend/lib/api.ts` | CREATE |
| `frontend/app/layout.tsx` | MODIFY (add sidebar nav) |
| `frontend/app/page.tsx` | MODIFY (redirect → /dashboard) |
| `frontend/app/dashboard/page.tsx` | CREATE |
| `frontend/app/jobs/page.tsx` | CREATE |
| `frontend/app/companies/page.tsx` | CREATE |
| `frontend/components/layout/Sidebar.tsx` | CREATE |
| `frontend/components/ui/StatsCard.tsx` | CREATE |
| `frontend/components/ui/ConfidenceBadge.tsx` | CREATE |
| `frontend/components/ui/Pagination.tsx` | CREATE |
| `frontend/components/jobs/JobFilters.tsx` | CREATE |
| `frontend/components/jobs/JobsTable.tsx` | CREATE |
| `frontend/components/companies/CompaniesTable.tsx` | CREATE |

---

## Verification Checklist

1. `docker compose up -d` — all 4 services healthy (postgres, redis, backend, worker)
2. `POST http://localhost:4000/api/search` `{ "keyword": "SAP consultant", "country": "DE" }` → `{ "status": "queued" }`
3. Worker logs: Apify run triggered → dataset fetched → jobs filtered → inserted into DB
4. `GET http://localhost:4000/api/jobs` → jobs returned with `aiStatus: "PENDING"`
5. AI worker logs: batches processed → `GET /api/jobs?minConfidence=0.7` returns classified jobs
6. `GET http://localhost:4000/api/companies` → company aggregations with avg confidence
7. `http://localhost:3000/dashboard` — live stats cards
8. `http://localhost:3000/jobs` — table with working filters + pagination
9. `http://localhost:3000/companies` — sorted by avg confidence DESC
