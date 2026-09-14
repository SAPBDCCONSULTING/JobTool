import pino from 'pino';
const isDev = process.env.NODE_ENV !== 'production';
export const logger = pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
        ? {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        }
        : undefined,
});
//# sourceMappingURL=logger.js.map