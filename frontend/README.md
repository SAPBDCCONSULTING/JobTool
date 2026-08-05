# Frontend — HireIntel Dashboard

Next.js 16 + React 19 + Tailwind CSS v4 + App Router

## Prerequisites

- Node.js 20+
- Backend API running on port 4000 (or use demo mode)

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create env file**
```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_USE_DEMO_DATA=true
```

> Set `NEXT_PUBLIC_USE_DEMO_DATA=true` to use built-in demo data without a running backend.
> Set to `false` to connect to the real API.

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard` automatically.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Stats overview, search form, recent activity |
| `/jobs` | Job listings with filters and pagination |
| `/companies` | Company intelligence ranked by AI confidence |

## Demo vs Live Mode

| Mode | `NEXT_PUBLIC_USE_DEMO_DATA` | Requires backend |
|---|---|---|
| Demo | `true` | No |
| Live | `false` | Yes (port 4000) |

Demo mode uses pre-built sample data from `lib/demo/data.ts` — useful for UI development without API keys.
