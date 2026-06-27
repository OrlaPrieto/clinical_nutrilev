import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Security: Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Security: Helmet headers
  app.use(helmet());

  // Security: Restricted CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  const frontendUrl = process.env.FRONTEND_URL;
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (frontendUrl) allowedOrigins.push(frontendUrl);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow if no origin (like mobile apps or curl), if in allowed list, or if it's a Vercel preview deployment for this project
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (isDev && origin.includes('localhost')) ||
        (origin.includes('vercel.app') && origin.includes('clinical-nutrilev'))
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-user-email',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => console.error(err));
