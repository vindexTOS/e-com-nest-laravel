import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { DatabaseEventSubscriber } from './database-event-subscriber.service';
import { DatabaseConnectionHelper } from './database-connection.helper';
import { InitialSyncService } from './initial-sync.service';
import { ElasticsearchModule } from '../search/elasticsearch.module';

@Module({
  imports: [
    ElasticsearchModule,
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_READ_HOST', 'postgres-read'),
        port: configService.get<number>('DATABASE_READ_PORT', 5432),
        username: configService.get<string>('DATABASE_READ_USER', 'ecom_user'),
        password: configService.get<string>(
          'DATABASE_READ_PASSWORD',
          'ecom_password',
        ),
        database: configService.get<string>(
          'DATABASE_READ_NAME',
          'ecom_db_read',
        ),
        entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
        synchronize: false,
        logging: false,
        extra: {
          application_name: 'nestjs-default',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'write',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>(
          'DATABASE_WRITE_HOST',
          'postgres-write',
        ),
        port: configService.get<number>('DATABASE_WRITE_PORT', 5432),
        username: configService.get<string>('DATABASE_WRITE_USER', 'ecom_user'),
        password: configService.get<string>(
          'DATABASE_WRITE_PASSWORD',
          'ecom_password',
        ),
        database: configService.get<string>(
          'DATABASE_WRITE_NAME',
          'ecom_db_write',
        ),
        entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
        migrations: [join(__dirname, '../migrations/*.{ts,js}')],
        synchronize: false,
        logging: false,
        migrationsRun: false,
        extra: {
          application_name: 'nestjs-write',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'read',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_READ_HOST', 'postgres-read'),
        port: configService.get<number>('DATABASE_READ_PORT', 5432),
        username: configService.get<string>('DATABASE_READ_USER', 'ecom_user'),
        password: configService.get<string>(
          'DATABASE_READ_PASSWORD',
          'ecom_password',
        ),
        database: configService.get<string>(
          'DATABASE_READ_NAME',
          'ecom_db_read',
        ),
        entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
        synchronize: false,
        logging: false,
        extra: {
          application_name: 'nestjs-read',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseEventSubscriber,
    DatabaseConnectionHelper,
    InitialSyncService,
  ],
  exports: [DatabaseEventSubscriber, DatabaseConnectionHelper],
})
export class DatabaseModule {}
