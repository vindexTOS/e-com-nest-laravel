import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './infrastructure/libs/filters/http-exception.filter';
import { LoggingInterceptor } from './infrastructure/libs/interceptors/logging.interceptor';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

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

  const config = new DocumentBuilder()
    .setTitle('E-commerce API Gateway')
    .setDescription('API Gateway for E-commerce Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.setGlobalPrefix('api/gateway');

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);
  const redisHost = configService.get('REDIS_HOST') || 'redis';
  const redisPort = Number(configService.get('REDIS_PORT') || 6379);
  const port = Number(configService.get('PORT') || 3000);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: redisHost,
      port: redisPort,
    },
  });
  await app.startAllMicroservices();

  await app.listen(port, '0.0.0.0');
}
bootstrap();
