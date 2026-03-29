-- Fix: partial unique index cannot back Supabase/Postgres ON CONFLICT for upsert.
-- Replaces 20260329150000 partial index with a plain UNIQUE constraint on the same columns.
-- Path: supabase/migrations/20260329170000_academic_records_fix_unique.sql

DROP INDEX IF EXISTS public.academic_records_neis_line_uq;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'academic_records_upsert_key'
      AND conrelid = 'public.academic_records'::regclass
  ) THEN
    ALTER TABLE public.academic_records
    ADD CONSTRAINT academic_records_upsert_key
    UNIQUE (student_id, semester, subject_name, credit_unit);
  END IF;
END $$;
