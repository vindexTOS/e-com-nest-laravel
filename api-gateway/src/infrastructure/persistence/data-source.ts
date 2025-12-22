import { DataSource } from 'typeorm';
import { join } from 'path';

export const WriteDataSource = new DataSource({
  type: 'postgres',
  host: 'postgres-write',
  port: 5432,
  username: 'ecom_user',
  password: 'ecom_password',
  database: 'ecom_db_write',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: true,
});

export const ReadDataSource = new DataSource({
  type: 'postgres',
  host: 'postgres-read',
  port: 5432,
  username: 'ecom_user',
  password: 'ecom_password',
  database: 'ecom_db_read',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
  synchronize: false,
  logging: true,
});

export const AppDataSource = WriteDataSource;

