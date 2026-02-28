# RIS Database Troubleshooting Guide

## Quick Diagnostics

### 1. Check SQL Server Status
```powershell
Get-Service MSSQL* | Select-Object DisplayName, Status
```

**Expected Output:**
```
DisplayName           Status
-----------           ------
SQL Server (...) ...  Running
```

If status is `Stopped`, start it:
```powershell
Start-Service MSSQLSERVER  # or the appropriate service name
```

---

### 2. Test Database Connection
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT @@VERSION"
```

**Expected Output:** SQL Server version information

**If connection fails:** Check credentials in `local-backend\.env`

---

### 3. Check if RIS_System Database Exists
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT name FROM sys.databases WHERE name = 'RIS_System'"
```

**Expected Output:**
```
name
----
RIS_System
```

**If empty:** Database doesn't exist, run `setup-database.ps1` script

---

### 4. Check Tables in Database
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME"
```

**Expected Output:**
```
TABLE_NAME
------------------
appointments
app_roles
billing
devices
exam_orders
exam_templates
notifications
patient_history
patients
profiles
reports
user_preferences
user_permissions
user_roles
users
```

**If empty:** Schema not applied, run `setup-database.ps1` script

---

### 5. Check Patients Table Data
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as patient_count FROM patients"
```

**Expected Output:**
```
patient_count
--------------
3
```

(Should show 3 sample patients from seed)

**If 0:** Data not seeded, run: `cd local-backend && npm run seed`

---

### 6. Check Users Table
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT email, is_active FROM users"
```

**Expected Output:**
```
email                 is_active
--------------------- ---------
admin@radiance.test   1
rad1@radiance.test    1
tech1@radiance.test   1
recept1@radiance.test 1
```

---

## Common Errors and Solutions

### Error: "Failed to load resource: the server responded with a status of 500"

#### Possible Causes:

**1. Database Connection Failed**
```powershell
# Test connection
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT 'Connected'"
```

**Solution:** 
- Check SQL Server is running: `Get-Service MSSQL*`
- Verify credentials in `local-backend\.env`
- Start SQL Server if stopped

---

**2. Patients Table Doesn't Exist**
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) FROM patients"
```

**Solution:**
```powershell
# Run the database setup script
.\setup-database.ps1
```

---

**3. Backend Service Not Running**
```powershell
# Check if backend is running on port 3001
netstat -ano | findstr :3001
```

**Solution:**
```bash
cd local-backend
npm install
npm start
```

---

### Error: "sqlcmd is not recognized"

SQL Server tools not in PATH.

**Solution:**
Install SQL Server Command Line Tools or use full path:
```powershell
C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT @@VERSION"
```

---

### Error: "Login failed for user 'sa'"

Wrong password or account locked.

**Solution:**
```powershell
# Reset SQL Server sa password using SQL Server Management Studio
# Or use SSMS to verify the password
```

Check `.env` file has correct password.

---

## Complete Reset Procedure

If everything is broken and you want to start fresh:

### Step 1: Drop the database
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "DROP DATABASE RIS_System"
```

### Step 2: Run setup script
```powershell
.\setup-database.ps1
```

### Step 3: Verify tables exist
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo'"
```

### Step 4: Start backend
```bash
cd local-backend
npm start
```

---

## Backend Logs

When running `npm start`, watch the console for error messages:

```
❌ Database connection failed: [error details]
```

These logs will tell you exactly what's wrong.

---

## Port Conflicts

If port 3001 is already in use:

```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use a different port
$env:PORT=3002
npm start
```

---

## API Health Check

Once backend is running:

```powershell
# Test the health endpoint
Invoke-WebRequest http://localhost:3001/api/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "message": "RIS Backend is running"
}
```

If this works, the `/api/patients` endpoint should also work (assuming you're authenticated).

---

## Need Help?

1. Run all diagnostics from section "Quick Diagnostics" above
2. Check backend console logs for error messages
3. Verify SQL Server is running: `Get-Service MSSQL*`
4. Try complete reset procedure if all else fails
