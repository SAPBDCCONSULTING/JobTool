import { Redis } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  // Required by BullMQ — never block the event loop waiting for Redis commands
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('close', () => logger.warn('Redis connection closed'));

// BullMQ bundles its own ioredis, so pass a structurally-compatible connection.
export const redisConnection = redis as unknown as ConnectionOptions;
