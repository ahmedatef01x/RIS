# RIS API Error: 500 Internal Server Error on /api/patients

## Problem Summary

You're seeing a **500 Internal Server Error** when the frontend tries to load patients:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
:3001/api/patients:1
```

## Root Cause

The backend SQL Server database **tables haven't been created or initialized yet**. When the API tries to execute:
```sql
SELECT * FROM patients
```

The `patients` table doesn't exist, causing a SQL Server error that results in a 500 response.

## Solution

You need to initialize the database with the schema and seed data. Here are your options:

### Option 1: Automated Setup (Recommended)

Run the PowerShell setup script:

```powershell
# Navigate to project root
cd c:\Users\pc\Downloads\radiance-ris-main (8)\radiance-ris-main

# Run the setup script
.\setup-database.ps1
```

This will:
1. ✅ Create the RIS_System database
2. ✅ Apply the database schema
3. ✅ Run migrations
4. ✅ Install NPM dependencies
5. ✅ Seed sample data

### Option 2: Manual Setup

If the automated script doesn't work, follow these steps:

#### Step 1: Create the Database
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "CREATE DATABASE RIS_System"
```

#### Step 2: Apply Schema
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\database\schema.sql"
```

#### Step 3: Apply Migrations
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_accession_number.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\split_names.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_names_dictionary_fixed.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\insert_names.sql"
```

#### Step 4: Install Dependencies and Seed
```bash
cd local-backend
npm install
npm run seed
```

## Verification

After setup, verify everything works:

```powershell
# Check tables were created
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo'"

# Check sample data exists
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as patient_count FROM patients"
```

Expected results:
- table_count: ~15 tables
- patient_count: 3 sample patients

## Starting the Backend

Once database is initialized:

```bash
cd local-backend
npm start
```

Backend should start on `http://localhost:3001`

## Verification in Frontend

Once the backend is running:

1. Open your browser to the frontend (usually `http://localhost:5173`)
2. You should **no longer see the 500 error** on `/api/patients`
3. If you're logged in, the patients list should load

## Quick Troubleshooting

### Still getting 500 error?

```powershell
# Check if SQL Server is running
Get-Service MSSQL* | Select-Object DisplayName, Status

# Check if database exists
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT name FROM sys.databases WHERE name = 'RIS_System'"

# Check if tables exist
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) FROM patients"
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed diagnostics.

## Files Created

I've created helper files for you:

1. **setup-database.ps1** - Automated setup script (run this first!)
2. **DATABASE_SETUP.md** - Detailed setup instructions
3. **TROUBLESHOOTING.md** - Comprehensive troubleshooting guide

## Database Credentials

Your current configuration (from `.env`):
- **Server:** `127.0.0.1\SQLEXPRESS`
- **Database:** `RIS_System`
- **User:** `sa`
- **Password:** `123456`
- **Port:** `1433`

## Sample Data

After seeding, you'll have:

**Users:**
- admin@radiance.test (password: password)
- rad1@radiance.test (password: password)
- tech1@radiance.test (password: password)
- recept1@radiance.test (password: password)

**Patients:**
- MRN001: Mohamed Ali
- MRN002: Aisha Hassan
- MRN003: Omar Salah

## Next Steps

1. Run `.\setup-database.ps1` 
2. Start backend: `cd local-backend && npm start`
3. Refresh frontend - error should be gone!

---

**Need help?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed diagnostics and solutions.
