import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { DatabaseEventSubscriber } from './database-event-subscriber.service';
import { DatabaseConnectionHelper } from './database-connection.helper';
import { InitialSyncService } from './initial-sync.service';
import { ElasticsearchModule } from '../search/elasticsearch.module';

@Module({
  imports: [
    ElasticsearchModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_READ_HOST || 'postgres-read',
      port: parseInt(process.env.DATABASE_READ_PORT || '5432', 10),
      username: process.env.DATABASE_READ_USER || 'ecom_user',
      password: process.env.DATABASE_READ_PASSWORD || 'ecom_password',
      database: process.env.DATABASE_READ_NAME || 'ecom_db_read',
      entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
      synchronize: false,
      logging: false,
      extra: {
        application_name: 'nestjs-default',
      },
    }),
    TypeOrmModule.forRoot({
      name: 'write',
      type: 'postgres',
      host: process.env.DATABASE_WRITE_HOST || 'postgres-write',
      port: parseInt(process.env.DATABASE_WRITE_PORT || '5432', 10),
      username: process.env.DATABASE_WRITE_USER || 'ecom_user',
      password: process.env.DATABASE_WRITE_PASSWORD || 'ecom_password',
      database: process.env.DATABASE_WRITE_NAME || 'ecom_db_write',
      entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
      migrations: [join(__dirname, '../migrations/*.{ts,js}')],
      synchronize: false,
      logging: false,
      migrationsRun: false,
      extra: {
        application_name: 'nestjs-write',
      },
    }),
    TypeOrmModule.forRoot({
      name: 'read',
      type: 'postgres',
      host: process.env.DATABASE_READ_HOST || 'postgres-read',
      port: parseInt(process.env.DATABASE_READ_PORT || '5432', 10),
      username: process.env.DATABASE_READ_USER || 'ecom_user',
      password: process.env.DATABASE_READ_PASSWORD || 'ecom_password',
      database: process.env.DATABASE_READ_NAME || 'ecom_db_read',
      entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
      synchronize: false,
      logging: false,
      extra: {
        application_name: 'nestjs-read',
      },
    }),
  ],
  providers: [DatabaseEventSubscriber, DatabaseConnectionHelper, InitialSyncService],
  exports: [DatabaseEventSubscriber, DatabaseConnectionHelper],
})
export class DatabaseModule {}

