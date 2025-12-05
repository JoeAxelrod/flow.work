#!/bin/bash

echo "Terminating existing sessions on 'workflow'..."

docker compose exec -e PGPASSWORD=postgres -T pg1 \
  psql -h db -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
    WHERE datname = 'workflow'
      AND pid <> pg_backend_pid();"

echo "Dropping and recreating 'workflow' database..."

docker compose exec -e PGPASSWORD=postgres -T pg1 \
  psql -h db -U postgres -d postgres -c "DROP DATABASE IF EXISTS workflow;"

docker compose exec -e PGPASSWORD=postgres -T pg1 \
  psql -h db -U postgres -d postgres -c "CREATE DATABASE workflow;"

echo "Initializing database schema on 'workflow'..."

docker compose exec -e PGPASSWORD=postgres -T pg1 \
  psql -h db -U postgres -d workflow < api/schema.sql

echo "Database reset complete!"
