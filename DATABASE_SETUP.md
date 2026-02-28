# Database Setup Instructions

## Issue
You're getting a 500 error when calling `/api/patients` because the database tables haven't been created yet.

## Solution

### Step 1: Create the Database
Open SQL Server Management Studio or use SQL Server command line and run:

```sql
CREATE DATABASE RIS_System;
GO
USE RIS_System;
GO
```

### Step 2: Initialize the Schema
Run the schema.sql file in your database. You can do this by:

**Option A: Using SQL Server Management Studio**
1. Open SQL Server Management Studio
2. Connect to your SQL Server instance
3. Open the file: `local-backend\database\schema.sql`
4. Execute the script

**Option B: Using sqlcmd (Command Line)**
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\database\schema.sql"
```

### Step 3: Apply Migrations
Run each migration file in order:

```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_accession_number.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\split_names.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_names_dictionary_fixed.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\insert_names.sql"
```

### Step 4: Seed Sample Data
Navigate to the local-backend directory and run:

```bash
cd local-backend
npm install
npm run seed
```

### Step 5: Verify the Setup
Check that the tables were created:

```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo'"
```

You should see tables like: patients, users, devices, exam_orders, reports, billing, etc.

## Environment Variables
Make sure your `.env` file in `local-backend` is configured correctly:

```
DB_SERVER=127.0.0.1\SQLEXPRESS
DB_DATABASE=RIS_System
DB_USER=sa
DB_PASSWORD=123456
DB_PORT=1433
PORT=3001
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
```

## Starting the Backend
After setup is complete:

```bash
cd local-backend
npm install  # if not already done
npm start    # or npm run dev for development with auto-reload
```

The backend should now start without errors and be ready to serve API requests.

## Troubleshooting

### Still getting 500 error?
1. **Check SQL Server is running**: 
   ```powershell
   Get-Service MSSQL* | Select-Object DisplayName, Status
   ```

2. **Check connection string** in `.env` file is correct

3. **Verify tables exist**:
   ```powershell
   sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT * FROM patients"
   ```

4. **Check backend logs**: Look for detailed error messages when running `npm start`

5. **Reset the database** if needed:
   ```powershell
   sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "DROP DATABASE RIS_System"
   ```
   Then repeat Steps 1-4 above.
