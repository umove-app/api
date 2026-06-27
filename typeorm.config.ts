import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'umove_user',
  password: process.env.DB_PASSWORD || 'umove_password',
  database: process.env.DB_DATABASE || 'umove_db',
  entities: ['dist/entities/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  // Per-migration transactions so migrations can opt out of a transaction when
  // required (e.g. Postgres ALTER TYPE ... ADD VALUE).
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
