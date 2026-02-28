# RIS Database Setup Checklist

## 🚀 Quick Start (5 minutes)

### ✅ Prerequisites
- [ ] SQL Server is installed and running
- [ ] SQL Server is accessible at `127.0.0.1\SQLEXPRESS`
- [ ] Default `sa` password is `123456` (or update in `local-backend\.env`)
- [ ] PowerShell is available
- [ ] Node.js and npm are installed

### ✅ Automated Setup
- [ ] Navigate to project root: `c:\Users\pc\Downloads\radiance-ris-main (8)\radiance-ris-main`
- [ ] Run setup script: `.\setup-database.ps1`
- [ ] Wait for all 5 steps to complete (should show ✅ marks)

### ✅ Verify Installation
```powershell
# Run this command to verify
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as patient_count FROM patients"
```
- [ ] Should return `patient_count: 3`

### ✅ Start Backend
```bash
cd local-backend
npm start
```
- [ ] Backend should say: `🚀 RIS Backend running on http://localhost:3001`

### ✅ Test Frontend
- [ ] Open frontend in browser (usually `http://localhost:5173`)
- [ ] Should not see 500 error on `/api/patients`
- [ ] Login with test credentials
- [ ] Patients list should load

---

## 📋 Manual Setup (If automated fails)

### Step 1: Create Database
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "CREATE DATABASE RIS_System"
```
- [ ] Command executes without error

### Step 2: Apply Schema
```powershell
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\database\schema.sql"
```
- [ ] Schema applied successfully

### Step 3: Apply Migrations
```powershell
# Run each migration in order
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_accession_number.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\split_names.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\add_names_dictionary_fixed.sql"
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\migrations\insert_names.sql"
```
- [ ] All migrations applied

### Step 4: Install Dependencies
```bash
cd local-backend
npm install
```
- [ ] Dependencies installed

### Step 5: Seed Data
```bash
npm run seed
```
- [ ] Sample data seeded (should show user and patient insertions)

### Step 6: Start Backend
```bash
npm start
```
- [ ] Backend running on port 3001

---

## 🔍 Troubleshooting Checklist

### SQL Server Not Running
- [ ] Check service status: `Get-Service MSSQL* | Select-Object DisplayName, Status`
- [ ] If stopped, start it: `Start-Service MSSQLSERVER`
- [ ] Or start via SQL Server Configuration Manager

### Database Not Created
- [ ] Check if database exists:
  ```powershell
  sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "SELECT name FROM sys.databases WHERE name = 'RIS_System'"
  ```
- [ ] If no output, run: `sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "CREATE DATABASE RIS_System"`

### Tables Not Created
- [ ] Check tables:
  ```powershell
  sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo'"
  ```
- [ ] If count is 0, re-run schema: `sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -i "local-backend\database\schema.sql"`

### No Sample Data
- [ ] Check patient count:
  ```powershell
  sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -d RIS_System -Q "SELECT COUNT(*) as patient_count FROM patients"
  ```
- [ ] If 0, run seed: `cd local-backend && npm run seed`

### Backend Won't Start
- [ ] Check backend logs for detailed error
- [ ] Verify `.env` file has correct credentials:
  - DB_SERVER=127.0.0.1\SQLEXPRESS
  - DB_USER=sa
  - DB_PASSWORD=123456
  - DB_DATABASE=RIS_System

### Port 3001 Already in Use
- [ ] Check what's using it: `netstat -ano | findstr :3001`
- [ ] Kill process: `taskkill /PID <PID> /F`
- [ ] Or change port in `.env`: `PORT=3002`

---

## 📝 Test Credentials

After setup, use these to login:

| Email | Password | Role |
|-------|----------|------|
| admin@radiance.test | password | Admin |
| rad1@radiance.test | password | Radiologist |
| tech1@radiance.test | password | Technician |
| recept1@radiance.test | password | Reception |

---

## ✨ Success Indicators

- [ ] `setup-database.ps1` completes with ✅ marks
- [ ] All 5 steps show "Successfully"
- [ ] Backend console shows: `🚀 RIS Backend running on http://localhost:3001`
- [ ] Frontend loads without 500 errors
- [ ] Patients list appears when logged in
- [ ] Can create/edit/view patients

---

## 🆘 If All Else Fails

Reset everything:

```powershell
# Drop database
sqlcmd -S 127.0.0.1\SQLEXPRESS -U sa -P 123456 -Q "DROP DATABASE RIS_System"

# Re-run setup
.\setup-database.ps1

# Start backend
cd local-backend
npm start
```

---

## 📚 Related Documents

- [API_ERROR_SOLUTION.md](API_ERROR_SOLUTION.md) - Explanation of the 500 error
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Detailed setup guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Comprehensive troubleshooting

---

**Estimated time:** 5 minutes ⏱️

**Difficulty:** Easy 🟢

**Status:** Ready to proceed! ✅
