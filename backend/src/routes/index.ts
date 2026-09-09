import { Router } from 'express';
import { searchRouter } from './search.js';
import { jobsRouter } from './jobs.js';
import { companiesRouter } from './companies.js';
import { statsRouter } from './stats.js';
import { scrapeCountryRouter } from './scrape-country.js';
import { opportunitiesRouter } from './opportunities.js';
import { pitchesRouter } from './pitches.js';
import { feedbackRouter } from './feedback.js';
import { schedulerRouter } from './scheduler.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/jobs', jobsRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/scrape-country', scrapeCountryRouter);
apiRouter.use('/opportunities', opportunitiesRouter);
apiRouter.use('/pitches', pitchesRouter);
apiRouter.use('/feedback', feedbackRouter);
apiRouter.use('/scheduler', schedulerRouter);
