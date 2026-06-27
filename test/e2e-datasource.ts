import { DataSource } from 'typeorm';

/**
 * DataSource for running migrations against the isolated e2e Postgres using the
 * TypeScript sources directly (via ts-node), since the webpack build does not
 * emit individual dist/migrations/*.js files.
 */
const E2EDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'umove_user',
  password: process.env.DB_PASSWORD || 'umove_password',
  database: process.env.DB_DATABASE || 'umove',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  // Run each migration in its own transaction so migrations that must run
  // outside a transaction (e.g. ALTER TYPE ... ADD VALUE) can opt out.
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: false,
  ssl: false,
});

export default E2EDataSource;
