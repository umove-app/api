import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const { createClient } = await import('redis');

        const useTls = String(configService.get('REDIS_TLS', '')).toLowerCase() === 'true';
        const host = configService.get('REDIS_HOST', 'localhost');
        const port = Number(configService.get('REDIS_PORT', 6379));

        const client = createClient({
          socket: {
            host,
            port,
            tls: useTls,
            // Bounded reconnect backoff. Returning a number reschedules the
            // attempt; we never give up, but we never throw synchronously either.
            reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
          },
          password: configService.get('REDIS_PASSWORD') || undefined,
          database: Number(configService.get('REDIS_DB', 0)),
        });

        client.on('error', (err) => logger.error(`Redis Client Error: ${err.message}`));
        client.on('ready', () => logger.log(`Redis connected (${host}:${port})`));
        client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

        // IMPORTANT: do NOT await connect() here. Awaiting blocks Nest's
        // bootstrap (and therefore app.listen() and the platform healthcheck)
        // until Redis is reachable. Connect in the background and let the
        // reconnect strategy handle transient unavailability so the HTTP server
        // can come up immediately.
        client.connect().catch((err) =>
          logger.error(`Initial Redis connection failed: ${err.message}`),
        );

        return client;
      },
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
