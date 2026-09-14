# ── Build stage: compile TypeScript + generate Prisma client ──────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ── Runtime stage: Node + Python (needed for the Playwright country scrapers) ──
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Install Python 3 + venv (for the country-site scrapers)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Node deps + compiled app + Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Scraper code (Python) — scrape.py, sites/, parsers/, requirements.txt
COPY scraper ./scraper

# Create a scraper venv, install deps + Chromium (with OS libs)
# venv lands at /app/scraper/venv so SCRAPER_PYTHON=venv/bin/python3 resolves unchanged.
RUN python3 -m venv /app/scraper/venv \
    && /app/scraper/venv/bin/pip install --no-cache-dir -r /app/scraper/requirements.txt \
    && /app/scraper/venv/bin/playwright install --with-deps chromium

EXPOSE 4000

# Run migrations, then start the combined API + workers in one process
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

