import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'ecom_user',
  password: process.env.DATABASE_PASSWORD || 'ecom_password',
  database: process.env.DATABASE_NAME || 'ecom_db',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, './migrations/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

