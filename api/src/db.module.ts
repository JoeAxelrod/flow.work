import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import 'dotenv/config';
import { pgProviders } from './pg.providers';

@Module({
  providers: [
    {
      provide: 'PG',
      useFactory: async () => {
        const config = process.env.DATABASE_URL
          ? { connectionString: process.env.DATABASE_URL }
          : {
              host: process.env.PGHOST ?? 'localhost',
              port: Number(process.env.PGPORT ?? 5432),
              user: process.env.PGUSER ?? 'postgres',
              password: String(process.env.PGPASSWORD ?? 'postgres'),
              database: process.env.PGDATABASE ?? 'workflow',
              ssl: false,
            };
      
        const pool = new Pool(config);
      
        try {
          await pool.query('SELECT 1'); // test connection
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('❌ DB connection failed:', message);
          process.exit(1); // stop the server
        }
      
        console.log('✅ DB connected');
        return pool;
      }
    },
    ...pgProviders,
  ],
  exports: ['PG', 'PG_PRIMARY', 'PG_REPLICA']
})
export class DbModule {}

