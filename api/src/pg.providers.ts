import { Pool } from 'pg';

export const pgProviders = [
  {
    provide: 'PG_PRIMARY',
    useFactory: () => {
      const pool = new Pool({
        host: process.env.PG_PRIMARY_HOST ?? process.env.PGHOST ?? 'localhost',
        port: +(process.env.PG_PRIMARY_PORT ?? process.env.PGPORT ?? 5432), // HAProxy RW
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD ?? 'postgres',
        database: process.env.PGDATABASE ?? 'workflow',
      });
      
      // Handle pool errors gracefully - don't crash the server
      pool.on('error', (err) => {
        console.error('⚠️ [PG_PRIMARY Pool] Unexpected error on idle client:', err.message);
        // Don't throw - let the pool handle reconnection automatically
      });
      
      return pool;
    },
  },
  {
    provide: 'PG_REPLICA',
    useFactory: () => {
      const pool = new Pool({
        host: process.env.PG_REPLICA_HOST ?? process.env.PGHOST ?? 'localhost',
        port: +(process.env.PG_REPLICA_PORT ?? 5433), // HAProxy RO
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD ?? 'postgres',
        database: process.env.PGDATABASE ?? 'workflow',
      });
      
      // Handle pool errors gracefully - don't crash the server
      pool.on('error', (err) => {
        console.error('⚠️ [PG_REPLICA Pool] Unexpected error on idle client:', err.message);
        // Don't throw - let the pool handle reconnection automatically
      });
      
      return pool;
    },
  },
];
