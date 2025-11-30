import { Pool } from 'pg';

export const pgProviders = [
  {
    provide: 'PG_PRIMARY',
    useFactory: () =>
      new Pool({
        host: process.env.PG_PRIMARY_HOST ?? process.env.PGHOST ?? 'localhost',
        port: +(process.env.PG_PRIMARY_PORT ?? process.env.PGPORT ?? 5432), // HAProxy RW
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD ?? 'postgres',
        database: process.env.PGDATABASE ?? 'workflow',
      }),
  },
  {
    provide: 'PG_REPLICA',
    useFactory: () =>
      new Pool({
        host: process.env.PG_REPLICA_HOST ?? process.env.PGHOST ?? 'localhost',
        port: +(process.env.PG_REPLICA_PORT ?? 5433), // HAProxy RO
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD ?? 'postgres',
        database: process.env.PGDATABASE ?? 'workflow',
      }),
  },
];
