import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { processRawItems } from './ingest.service.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRAPER_DIR = path.resolve(__dirname, '../../scraper');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * Run one country-site scrape + shared processing for a SourceRun.
 * Spawns `scrape.py` and streams its JSON output — worker-safe,
 * never called from the HTTP request path.
 */
export async function runCountryScrape(sourceRunId) {
    const run = await prisma.sourceRun.findUnique({
        where: { id: sourceRunId },
        include: { source: true, keyword: true },
    });
    if (!run || !run.keyword || !run.source.website) {
        throw new Error(`SourceRun ${sourceRunId} is incomplete (missing keyword or website)`);
    }
    await prisma.sourceRun.update({
        where: { id: run.id },
        data: { status: 'RUNNING', startedAt: new Date(), error: null },
    });
    const website = run.source.website;
    const term = run.keyword.term;
    const countryName = run.source.country ?? run.keyword.term;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    try {
        logger.info({ runId: run.id, website, keyword: term, country: countryName }, 'Starting country scrape');
        const pythonPath = path.resolve(SCRAPER_DIR, env.SCRAPER_PYTHON);
        const scrapePy = path.resolve(SCRAPER_DIR, 'scrape.py');
        const proc = spawn(pythonPath, [
            scrapePy,
            '--website', website,
            '--keyword', term,
            '--country', countryName,
        ], {
            cwd: SCRAPER_DIR,
            env: { ...process.env },
        });
        const timeout = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGKILL');
        }, env.COUNTRY_SCRAPE_TIMEOUT_MS);
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        const exitCode = await new Promise((resolve) => {
            proc.on('close', (code) => resolve(code ?? 1));
            proc.on('error', (err) => {
                stderr += `\nspawn error: ${err.message}`;
                resolve(1);
            });
        });
        clearTimeout(timeout);
        if (timedOut) {
            throw new Error(`Scraper timed out after ${env.COUNTRY_SCRAPE_TIMEOUT_MS / 1000}s`);
        }
        if (exitCode !== 0) {
            throw new Error(`Scraper exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
        }
        const parsed = JSON.parse(stdout);
        if (parsed && !Array.isArray(parsed) && parsed.error) {
            const message = parsed.message || `Scrape failed (${parsed.error})`;
            throw new Error(message);
        }
        const items = Array.isArray(parsed) ? parsed : [];
        const result = await processRawItems(items, {
            source: run.source.name,
            sourceRunId: run.id,
            keyword: term,
            keywordId: run.keyword.id ?? undefined,
            country: countryName,
            filterMode: 'keyword',
        });
        await prisma.sourceRun.update({
            where: { id: run.id },
            data: {
                status: 'SUCCESS',
                finishedAt: new Date(),
                itemsFetched: items.length,
                itemsNew: result.canonicalNew,
                itemsDup: result.rawExisting + result.canonicalMatched,
                itemsFiltered: result.filtered,
                itemsFailed: result.failed,
            },
        });
        // Give the classifer worker a head start before the UI marks the run done.
        if (result.canonicalNew > 0) {
            await sleep(3000);
        }
        logger.info({ runId: run.id, ...result, website }, 'Country scrape complete');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, runId: run.id, website }, 'Country scrape failed');
        await prisma.sourceRun.update({
            where: { id: run.id },
            data: { status: 'FAILED', finishedAt: new Date(), error: message.slice(0, 2000) },
        });
        throw err;
    }
}
//# sourceMappingURL=country-scrape.service.js.map