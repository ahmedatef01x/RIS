-- Database Migration: Add Accession Number Support
-- Date: December 12, 2025
-- Purpose: Add unique sequential accession numbers for each exam order (visit number)

-- The accession number:
-- 1. Is generated automatically for each exam order (e.g., ACC-000001, ACC-000002, etc.)
-- 2. Never repeats even if an exam is cancelled
-- 3. Is visible in:
--    - Worklist page (left column in the table)
--    - Scheduling/Appointments details dialog
-- 4. Uses a SQL Server SEQUENCE for efficient generation
-- 5. Has a UNIQUE constraint to prevent duplicates

-- Migration Status: Ready to apply
-- Application: Run add_accession_number.sql on the RIS_System database

-- Tables Modified:
-- 1. exam_orders
--    - Added column: accession_number (NVARCHAR(50))
--    - Added unique constraint: UQ_accession_number
--    - Added index: IX_exam_orders_accession

-- Functions Added:
-- fn_generate_accession_number() - Generates next accession number

-- Sequences Added:
-- seq_accession_number - Generates unique sequential numbers

-- Code Changes:
-- 1. Backend API (local-backend/src/routes/examOrders.js)
--    - Modified POST /exam_orders to generate accession_number automatically
--    - Accession number is generated using SQL Server sequence function

-- 2. Frontend UI Updates:
--    - Worklist.tsx: Added "رقم الزيارة" column at the start of the table
--    - Scheduling.tsx: Added accession_number display in appointment details dialog
--    - Both show accession number in a badge style (e.g., ACC-000001)

-- 3. API Response Updates:
--    - getExamOrders() now returns accession_number
--    - getAppointments() now returns accession_number from linked exam_order
