# Setup SQL Server RIS Database
# This script creates the database, applies schema, migrations, and seeds data

param(
    [string]$DBServer = "127.0.0.1\SQLEXPRESS",
    [string]$DBUser = "sa",
    [string]$DBPassword = "123456",
    [string]$DBName = "RIS_System"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "RIS Database Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Get the script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbDir = Join-Path $scriptDir "local-backend" "database"
$migrationsDir = Join-Path $scriptDir "local-backend" "migrations"
$backendDir = Join-Path $scriptDir "local-backend"

Write-Host "Using database server: $DBServer" -ForegroundColor Yellow
Write-Host "Database name: $DBName" -ForegroundColor Yellow
Write-Host ""

function RunSQLScript {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Running: $Description" -ForegroundColor Green
    Write-Host "File: $FilePath" -ForegroundColor Gray
    
    try {
        $output = sqlcmd -S $DBServer -U $DBUser -P $DBPassword -i $FilePath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully executed: $Description" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Error executing: $Description" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Failed to run script: $_" -ForegroundColor Red
        return $false
    }
}

# Step 1: Create database
Write-Host "`n[1/5] Creating Database..." -ForegroundColor Cyan
try {
    $createDbScript = @"
    IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '$DBName')
    BEGIN
        CREATE DATABASE [$DBName];
        PRINT 'Database created successfully';
    END
    ELSE
    BEGIN
        PRINT 'Database already exists';
    END
    GO
"@
    
    $tempFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempFile -Value $createDbScript
    
    sqlcmd -S $DBServer -U $DBUser -P $DBPassword -i $tempFile | Out-Null
    Remove-Item $tempFile
    Write-Host "✅ Database created or already exists" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create database: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Apply schema
Write-Host "`n[2/5] Applying Schema..." -ForegroundColor Cyan
$schemaFile = Join-Path $dbDir "schema.sql"
if (-not (RunSQLScript -FilePath $schemaFile -Description "Database Schema")) {
    Write-Host "⚠️  Schema application had issues, but continuing..." -ForegroundColor Yellow
}

# Step 3: Apply migrations
Write-Host "`n[3/5] Applying Migrations..." -ForegroundColor Cyan
$migrations = @(
    "add_accession_number.sql",
    "split_names.sql",
    "add_names_dictionary_fixed.sql",
    "insert_names.sql"
)

foreach ($migration in $migrations) {
    $migrationFile = Join-Path $migrationsDir $migration
    RunSQLScript -FilePath $migrationFile -Description "Migration: $migration" | Out-Null
}

# Step 4: Install npm dependencies
Write-Host "`n[4/5] Installing NPM Dependencies..." -ForegroundColor Cyan
try {
    Push-Location $backendDir
    Write-Host "Running: npm install" -ForegroundColor Green
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ NPM dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  NPM install had issues" -ForegroundColor Yellow
    }
    Pop-Location
}
catch {
    Write-Host "⚠️  Failed to run npm install: $_" -ForegroundColor Yellow
}

# Step 5: Seed data
Write-Host "`n[5/5] Seeding Sample Data..." -ForegroundColor Cyan
try {
    Push-Location $backendDir
    Write-Host "Running: npm run seed" -ForegroundColor Green
    npm run seed 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sample data seeded successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Seed script had issues" -ForegroundColor Yellow
    }
    Pop-Location
}
catch {
    Write-Host "⚠️  Failed to run seed script: $_" -ForegroundColor Yellow
}

# Verification
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

Write-Host "`nVerifying database tables..." -ForegroundColor Yellow
try {
    $verifyScript = @"
    USE [$DBName];
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME;
    GO
"@
    $tempFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempFile -Value $verifyScript
    
    $tables = sqlcmd -S $DBServer -U $DBUser -P $DBPassword -i $tempFile 2>&1 | Where-Object {$_ -match '^\w'}
    
    if ($tables.Count -gt 0) {
        Write-Host "✅ Found tables:" -ForegroundColor Green
        $tables | ForEach-Object { Write-Host "   - $_" -ForegroundColor Cyan }
    } else {
        Write-Host "⚠️  No tables found. Database may not be properly initialized." -ForegroundColor Yellow
    }
    
    Remove-Item $tempFile
}
catch {
    Write-Host "⚠️  Could not verify tables: $_" -ForegroundColor Yellow
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start the backend: cd local-backend; npm start" -ForegroundColor Cyan
Write-Host "2. The backend will be available at http://localhost:3001" -ForegroundColor Cyan
Write-Host "3. The frontend dev server should connect to the backend automatically" -ForegroundColor Cyan
Write-Host ""
