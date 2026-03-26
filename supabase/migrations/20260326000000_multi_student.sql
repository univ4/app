-- multi-student hardening migration
-- Path: supabase/migrations/20260326000000_multi_student.sql

-- -----------------------
-- 1) students column updates
-- -----------------------
alter table public.students
  add column if not exists display_name text,
  add column if not exists school_name text,
  add column if not exists grade integer default 3;

-- Keep grade consistent for existing rows
update public.students
set grade = 3
where grade is null;

alter table public.students
  alter column grade set default 3;

-- -----------------------
-- 2) ensure RLS enabled
-- -----------------------
alter table public.students enable row level security;
alter table public.academic_records enable row level security;
alter table public.student_records_text enable row level security;
alter table public.university_scoring_rules enable row level security;
alter table public.susi_gpa_rules enable row level security;
alter table public.converted_standard_scores enable row level security;
alter table public.guideline_chunks enable row level security;
alter table public.admission_schedules enable row level security;

-- -----------------------
-- 3) students RLS (single-student ownership)
-- -----------------------
drop policy if exists students_select_own on public.students;
create policy students_select_own on public.students
  for select
  using (auth.uid() = id);

drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists students_insert_self on public.students;
create policy students_insert_self on public.students
  for insert
  with check (auth.uid() = id);

-- -----------------------
-- 4) academic_records RLS (own student_id only)
-- -----------------------
drop policy if exists academic_records_select_own on public.academic_records;
create policy academic_records_select_own on public.academic_records
  for select
  using (auth.uid() = student_id);

drop policy if exists academic_records_insert_own on public.academic_records;
create policy academic_records_insert_own on public.academic_records
  for insert
  with check (auth.uid() = student_id);

drop policy if exists academic_records_update_own on public.academic_records;
create policy academic_records_update_own on public.academic_records
  for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists academic_records_delete_own on public.academic_records;
create policy academic_records_delete_own on public.academic_records
  for delete
  using (auth.uid() = student_id);

-- -----------------------
-- 5) student_records_text RLS (own student_id only)
-- -----------------------
drop policy if exists student_records_text_select_own on public.student_records_text;
create policy student_records_text_select_own on public.student_records_text
  for select
  using (auth.uid() = student_id);

drop policy if exists student_records_text_insert_own on public.student_records_text;
create policy student_records_text_insert_own on public.student_records_text
  for insert
  with check (auth.uid() = student_id);

drop policy if exists student_records_text_update_own on public.student_records_text;
create policy student_records_text_update_own on public.student_records_text
  for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists student_records_text_delete_own on public.student_records_text;
create policy student_records_text_delete_own on public.student_records_text
  for delete
  using (auth.uid() = student_id);

-- -----------------------
-- 6) shared read-only tables (authenticated users can read)
-- -----------------------
drop policy if exists university_scoring_rules_read_all on public.university_scoring_rules;
create policy university_scoring_rules_read_all on public.university_scoring_rules
  for select
  using (auth.role() = 'authenticated');

drop policy if exists susi_gpa_rules_read_all on public.susi_gpa_rules;
create policy susi_gpa_rules_read_all on public.susi_gpa_rules
  for select
  using (auth.role() = 'authenticated');

drop policy if exists converted_standard_scores_read_all on public.converted_standard_scores;
create policy converted_standard_scores_read_all on public.converted_standard_scores
  for select
  using (auth.role() = 'authenticated');

drop policy if exists guideline_chunks_read_all on public.guideline_chunks;
create policy guideline_chunks_read_all on public.guideline_chunks
  for select
  using (auth.role() = 'authenticated');

drop policy if exists admission_schedules_read_all on public.admission_schedules;
create policy admission_schedules_read_all on public.admission_schedules
  for select
  using (auth.role() = 'authenticated');

