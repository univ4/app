-- NEIS 파싱 JSON upsert용: (student_id, semester, subject_name, credit_unit) 유일
-- Path: supabase/migrations/20260329150000_academic_records_neis_upsert_unique.sql
-- scripts/ingest/load_neis_grades.ts 의 onConflict 대상

create unique index if not exists academic_records_neis_line_uq
  on public.academic_records (student_id, semester, subject_name, credit_unit)
  where record_type = 'SCHOOL_GPA'
    and semester is not null
    and subject_name is not null
    and credit_unit is not null;
