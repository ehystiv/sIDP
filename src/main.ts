import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.enableCors({
    origin: config.get('app.corsOrigin'),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('sIDP')
    .setDescription('SimpleIDP — a tiny, ready-to-use Identity Provider')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ?? '3000';
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  logger.log(`Server listening on ${host} at port ${port}`);
}
bootstrap();
