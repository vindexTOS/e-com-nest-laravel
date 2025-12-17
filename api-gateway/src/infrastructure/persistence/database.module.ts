import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'ecom_user'),
        password: configService.get('DATABASE_PASSWORD', 'ecom_password'),
        database: configService.get('DATABASE_NAME', 'ecom_db'),
        entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
        migrations: [join(__dirname, '../migrations/*.{ts,js}')],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

