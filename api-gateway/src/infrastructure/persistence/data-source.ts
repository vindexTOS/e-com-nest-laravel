import { DataSource } from 'typeorm';
import { join } from 'path';

export const WriteDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_WRITE_HOST || 'postgres-write',
  port: parseInt(process.env.DATABASE_WRITE_PORT || '5432', 10),
  username: process.env.DATABASE_WRITE_USER || 'ecom_user',
  password: process.env.DATABASE_WRITE_PASSWORD || 'ecom_password',
  database: process.env.DATABASE_WRITE_NAME || 'ecom_db_write',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: true,
});

export const ReadDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_READ_HOST || 'postgres-read',
  port: parseInt(process.env.DATABASE_READ_PORT || '5432', 10),
  username: process.env.DATABASE_READ_USER || 'ecom_user',
  password: process.env.DATABASE_READ_PASSWORD || 'ecom_password',
  database: process.env.DATABASE_READ_NAME || 'ecom_db_read',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
  synchronize: false,
  logging: true,
});

export const AppDataSource = WriteDataSource;

