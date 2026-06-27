import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get config service
  const configService = app.get(ConfigService);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable CORS
  const envOrigins = [
    configService.get('CUSTOMER_APP_URL'),
    configService.get('DRIVER_APP_URL'),
    configService.get('ADMIN_URL'),
    configService.get('MOBILE_WEB_URL'),
    configService.get('EXPO_WEB_URL'),
  ].filter(Boolean) as string[];
  const devOrigins =
    configService.get('NODE_ENV') !== 'production'
      ? [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:19006',
        'http://127.0.0.1:19006',
        'http://localhost:19000',
        'http://127.0.0.1:19000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]
      : [];
  const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));

  const isDevelopment = configService.get('NODE_ENV') !== 'production';

  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow all localhost origins
      if (isDevelopment && origin && origin.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/)) {
        callback(null, true);
        return;
      }
      // In development, allow LAN IP origins (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (isDevelopment && origin && origin.match(/^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/)) {
        callback(null, true);
        return;
      }
      // Allow no origin (same-origin requests, mobile apps)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });

  // Global prefix. Exclude the health routes so they are served at the root
  // (/, /health, /health/ping) regardless of the API prefix or versioning.
  // This gives the platform healthcheck a stable, unambiguous path.
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/ping', method: RequestMethod.GET },
    ],
  });

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('UMove Logistics API')
    .setDescription('Production-grade logistics management system API')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('customer', 'Customer endpoints')
    .addTag('driver', 'Driver endpoints')
    .addTag('vehicles', 'Vehicle management')
    .addTag('orders', 'Order/Booking management')
    .addTag('payments', 'Payment processing')
    .addTag('tracking', 'Real-time tracking')
    .addTag('reviews', 'Reviews and ratings')
    .addTag('notifications', 'Notifications')
    .addTag('admin', 'Admin endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // Start server
  const port = configService.get('PORT', 3000);
  // Listen on 0.0.0.0 to accept connections from Android emulator and local network
  await app.listen(port, '0.0.0.0');

  console.log(`
    ╔════════════════════════════════════════════════════╗
    ║                                                    ║
    ║   UMove Logistics API                             ║
    ║   Environment: ${configService.get('NODE_ENV')?.toUpperCase().padEnd(36)}║
    ║   Port: ${port.toString().padEnd(43)}║
    ║   API Docs: http://localhost:${port}/${apiPrefix}/docs${' '.repeat(10)}║
    ║                                                    ║
    ╚════════════════════════════════════════════════════╝
  `);
}

bootstrap();
