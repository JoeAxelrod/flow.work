# PowerShell script to drop and reset the database in Patroni cluster via HAProxy (db)

# Write-Host "Stopping containers and removing volumes..." -ForegroundColor Yellow
# docker compose down --volumes --remove-orphans

# Write-Host "Starting containers..." -ForegroundColor Yellow
# docker compose up -d

# Write-Host "Waiting for cluster (Patroni + HAProxy) to be ready..." -ForegroundColor Yellow
# Start-Sleep -Seconds 15   # you can tune this if needed

# Use psql from pg1 container, connect via HAProxy service 'db'
# 1) Kill all connections to 'workflow'
Write-Host "Terminating existing sessions on 'workflow'..." -ForegroundColor Yellow
docker compose exec -e PGPASSWORD=postgres -T pg1 `
  psql -h db -U postgres -d postgres -c `
  "SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
    WHERE datname = 'workflow'
      AND pid <> pg_backend_pid();"

# 2) Drop and recreate database
Write-Host "Dropping and recreating 'workflow' database..." -ForegroundColor Yellow
docker compose exec -e PGPASSWORD=postgres -T pg1 `
  psql -h db -U postgres -d postgres -c "DROP DATABASE IF EXISTS workflow;"

docker compose exec -e PGPASSWORD=postgres -T pg1 `
  psql -h db -U postgres -d postgres -c "CREATE DATABASE workflow;"

# 3) Apply schema
Write-Host "Initializing database schema on 'workflow'..." -ForegroundColor Yellow
Get-Content api/schema.sql | docker compose exec -e PGPASSWORD=postgres -T pg1 `
  psql -h db -U postgres -d workflow

Write-Host "Database reset complete!" -ForegroundColor Green
