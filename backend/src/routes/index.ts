import { Router } from 'express';
import { searchRouter } from './search.js';
import { jobsRouter } from './jobs.js';
import { companiesRouter } from './companies.js';
import { statsRouter } from './stats.js';

export const apiRouter = Router();

apiRouter.use('/search', searchRouter);
apiRouter.use('/jobs', jobsRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/stats', statsRouter);
