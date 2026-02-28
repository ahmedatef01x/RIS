-- Remove the check constraint on exam_type to allow dynamic exam types from exam_types table
ALTER TABLE public.exam_orders DROP CONSTRAINT IF EXISTS exam_orders_exam_type_check;