# PowerShell script to drop and reset the database
# This will remove all data and recreate the schema

Write-Host "Stopping containers and removing volumes..." -ForegroundColor Yellow
docker compose down --volumes

Write-Host "Starting database container..." -ForegroundColor Yellow
docker compose up -d 

Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Initializing database schema..." -ForegroundColor Yellow
Get-Content api/schema.sql | docker compose exec -T db psql -U postgres -d workflow

Write-Host "Database reset complete!" -ForegroundColor Green

