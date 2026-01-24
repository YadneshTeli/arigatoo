import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for web app and extension
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3000',
        /^chrome-extension:\/\/[a-z]{32}$/, // Valid Chrome extension ID format
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Simple Request Logger
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  /*
  // Global validation pipe - Temporarily Disabled
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  */

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
