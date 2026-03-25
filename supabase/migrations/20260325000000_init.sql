-- univ initial schema migration
-- Path: supabase/migrations/20260325000000_init.sql

create extension if not exists vector;

-- 1) students
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'viewer')),
  target_universities text[] not null default '{}',
  target_major text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) academic_records
create table if not exists public.academic_records (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  record_type text not null check (record_type in ('MOCK_EXAM', 'SCHOOL_GPA')),
  exam_date date not null,

  -- MOCK_EXAM fields
  korean_standard_score numeric(5,2),
  korean_percentile numeric(5,2),
  korean_grade smallint,
  math_standard_score numeric(5,2),
  math_percentile numeric(5,2),
  math_grade smallint,
  english_standard_score numeric(5,2),
  english_percentile numeric(5,2),
  english_grade smallint,
  sci1_standard_score numeric(5,2),
  sci1_percentile numeric(5,2),
  sci1_grade smallint,
  sci2_standard_score numeric(5,2),
  sci2_percentile numeric(5,2),
  sci2_grade smallint,

  -- SCHOOL_GPA fields
  subject_name text,
  raw_score numeric(5,2),
  avg_score numeric(5,2),
  stddev_score numeric(5,2),
  student_count integer,
  credit_unit integer,
  school_grade numeric(3,1),
  achievement_level text check (achievement_level in ('A', 'B', 'C', 'D', 'E')),

  created_at timestamptz not null default now()
);

create index if not exists idx_academic_records_student_id on public.academic_records(student_id);
create index if not exists idx_academic_records_record_type on public.academic_records(record_type);
create index if not exists idx_academic_records_exam_date on public.academic_records(exam_date desc);

-- 3) student_records_text
create table if not exists public.student_records_text (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  grade smallint not null check (grade in (1, 2, 3)),
  semester smallint not null check (semester in (1, 2)),
  subject text not null,
  record_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_records_text_student_id on public.student_records_text(student_id);
create index if not exists idx_student_records_text_grade_semester on public.student_records_text(grade, semester);

-- 4) university_scoring_rules
create table if not exists public.university_scoring_rules (
  id bigint generated always as identity primary key,
  university_name text not null,
  major_group text not null,
  admission_year integer not null,
  korean_ratio numeric(6,3) not null,
  math_ratio numeric(6,3) not null,
  english_ratio numeric(6,3) not null,
  science_ratio numeric(6,3) not null,
  science_2_bonus numeric(6,3) not null default 0,
  english_conversion_table jsonb not null,
  created_at timestamptz not null default now(),
  unique (university_name, major_group, admission_year)
);

create index if not exists idx_university_scoring_rules_univ_year on public.university_scoring_rules(university_name, admission_year);

-- 5) susi_gpa_rules
create table if not exists public.susi_gpa_rules (
  id bigint generated always as identity primary key,
  university_name text not null,
  admission_type text not null check (admission_type in ('학생부교과', '학생부종합', '논술전형', '정시')),
  admission_year integer not null,
  include_subjects text[] not null default '{}',
  career_choice_conversion jsonb not null,
  suneung_minimum jsonb,
  created_at timestamptz not null default now(),
  unique (university_name, admission_type, admission_year)
);

create index if not exists idx_susi_gpa_rules_univ_year on public.susi_gpa_rules(university_name, admission_year);

-- 6) converted_standard_scores
create table if not exists public.converted_standard_scores (
  id bigint generated always as identity primary key,
  university_name text not null,
  subject_name text not null,
  percentile numeric(5,2) not null,
  converted_score numeric(6,2) not null,
  admission_year integer not null,
  created_at timestamptz not null default now(),
  unique (university_name, subject_name, percentile, admission_year)
);

comment on table public.converted_standard_scores is
  '수능 성적 발표 후 대학별 탐구영역 변환표준점수를 일괄 적재하는 테이블';

create index if not exists idx_converted_scores_univ_subject_year on public.converted_standard_scores(university_name, subject_name, admission_year);

-- 7) guideline_chunks
create table if not exists public.guideline_chunks (
  id bigint generated always as identity primary key,
  university_name text not null,
  admission_year integer not null,
  admission_type text not null check (admission_type in ('학생부교과', '학생부종합', '논술전형', '정시')),
  chunk_text text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists guideline_chunks_embedding_hnsw_idx
  on public.guideline_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists idx_guideline_chunks_meta on public.guideline_chunks(university_name, admission_year, admission_type);

-- 8) admission_schedules
create table if not exists public.admission_schedules (
  id bigint generated always as identity primary key,
  university_name text not null,
  event_name text not null,
  event_type text not null check (event_type in ('수시', '정시', '공통')),
  event_date timestamptz not null,
  description text,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admission_schedules_univ_date on public.admission_schedules(university_name, event_date);

-- -----------------------
-- Row Level Security
-- -----------------------

alter table public.students enable row level security;
alter table public.academic_records enable row level security;
alter table public.student_records_text enable row level security;
alter table public.university_scoring_rules enable row level security;
alter table public.susi_gpa_rules enable row level security;
alter table public.converted_standard_scores enable row level security;
alter table public.guideline_chunks enable row level security;
alter table public.admission_schedules enable row level security;

-- students: 본인 row만 조회/수정 가능
drop policy if exists students_select_own on public.students;
create policy students_select_own on public.students
  for select using (auth.uid() = id);

drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists students_insert_self on public.students;
create policy students_insert_self on public.students
  for insert with check (auth.uid() = id);

-- academic_records: student_id가 본인인 row만 접근
drop policy if exists academic_records_select_own on public.academic_records;
create policy academic_records_select_own on public.academic_records
  for select using (auth.uid() = student_id);

drop policy if exists academic_records_insert_own on public.academic_records;
create policy academic_records_insert_own on public.academic_records
  for insert with check (auth.uid() = student_id);

drop policy if exists academic_records_update_own on public.academic_records;
create policy academic_records_update_own on public.academic_records
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists academic_records_delete_own on public.academic_records;
create policy academic_records_delete_own on public.academic_records
  for delete using (auth.uid() = student_id);

-- student_records_text: student_id가 본인인 row만 접근
drop policy if exists student_records_text_select_own on public.student_records_text;
create policy student_records_text_select_own on public.student_records_text
  for select using (auth.uid() = student_id);

drop policy if exists student_records_text_insert_own on public.student_records_text;
create policy student_records_text_insert_own on public.student_records_text
  for insert with check (auth.uid() = student_id);

drop policy if exists student_records_text_update_own on public.student_records_text;
create policy student_records_text_update_own on public.student_records_text
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists student_records_text_delete_own on public.student_records_text;
create policy student_records_text_delete_own on public.student_records_text
  for delete using (auth.uid() = student_id);

-- 공용 룰/요강/일정 테이블: 로그인 사용자 read-only
drop policy if exists university_scoring_rules_read_all on public.university_scoring_rules;
create policy university_scoring_rules_read_all on public.university_scoring_rules
  for select using (auth.role() = 'authenticated');

drop policy if exists susi_gpa_rules_read_all on public.susi_gpa_rules;
create policy susi_gpa_rules_read_all on public.susi_gpa_rules
  for select using (auth.role() = 'authenticated');

drop policy if exists converted_standard_scores_read_all on public.converted_standard_scores;
create policy converted_standard_scores_read_all on public.converted_standard_scores
  for select using (auth.role() = 'authenticated');

drop policy if exists guideline_chunks_read_all on public.guideline_chunks;
create policy guideline_chunks_read_all on public.guideline_chunks
  for select using (auth.role() = 'authenticated');

drop policy if exists admission_schedules_read_all on public.admission_schedules;
create policy admission_schedules_read_all on public.admission_schedules
  for select using (auth.role() = 'authenticated');

