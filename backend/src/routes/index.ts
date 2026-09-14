import { Router } from 'express';
import { searchRouter } from './search.js';
import { jobsRouter } from './jobs.js';
import { companiesRouter } from './companies.js';
import { statsRouter } from './stats.js';
import { scrapeCountryRouter } from './scrape-country.js';
import { keywordsRouter } from './keywords.js';
import { sourcesRouter } from './sources.js';
import { runsRouter } from './runs.js';
import { outreachRouter } from './outreach.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/jobs', jobsRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/scrape-country', scrapeCountryRouter);
apiRouter.use('/keywords', keywordsRouter);
apiRouter.use('/sources', sourcesRouter);
apiRouter.use('/runs', runsRouter);
apiRouter.use('/outreach', outreachRouter);
