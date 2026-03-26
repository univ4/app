-- P1-11: 선택과목 프로필 및 대학별 과목 요건
-- universities / departments: univ_subject_requirements FK용 (기존 스키마에 없음)

-- -----------------------
-- 1) universities
-- -----------------------
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create index if not exists idx_universities_name on public.universities (name);

alter table public.universities enable row level security;

drop policy if exists universities_select_authenticated on public.universities;
create policy universities_select_authenticated on public.universities
  for select
  using (auth.role() = 'authenticated');

-- -----------------------
-- 2) departments
-- -----------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, name)
);

create index if not exists idx_departments_university_id on public.departments (university_id);

alter table public.departments enable row level security;

drop policy if exists departments_select_authenticated on public.departments;
create policy departments_select_authenticated on public.departments
  for select
  using (auth.role() = 'authenticated');

-- -----------------------
-- 3) subject_profiles
-- -----------------------
create table if not exists public.subject_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  year integer not null default 2027 check (year = 2027),
  korean_subject text not null
    check (korean_subject in ('언어와매체', '화법과작문')),
  math_subject text not null
    check (math_subject in ('미적분', '기하', '확률과통계')),
  science1 text,
  science2 text,
  social1 text,
  social2 text,
  second_foreign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, year)
);

create index if not exists idx_subject_profiles_student_id on public.subject_profiles (student_id);

alter table public.subject_profiles enable row level security;

drop policy if exists subject_profiles_select_own on public.subject_profiles;
create policy subject_profiles_select_own on public.subject_profiles
  for select
  using (auth.uid() = student_id);

drop policy if exists subject_profiles_insert_own on public.subject_profiles;
create policy subject_profiles_insert_own on public.subject_profiles
  for insert
  with check (auth.uid() = student_id);

drop policy if exists subject_profiles_update_own on public.subject_profiles;
create policy subject_profiles_update_own on public.subject_profiles
  for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists subject_profiles_delete_own on public.subject_profiles;
create policy subject_profiles_delete_own on public.subject_profiles
  for delete
  using (auth.uid() = student_id);

-- -----------------------
-- 4) univ_subject_requirements
-- -----------------------
create table if not exists public.univ_subject_requirements (
  id uuid primary key default gen_random_uuid(),
  univ_id uuid not null references public.universities(id) on delete cascade,
  dept_id uuid not null references public.departments(id) on delete cascade,
  year integer not null default 2027 check (year = 2027),
  required_math text[],
  required_science text[],
  preferred_subjects jsonb not null default '{}'::jsonb,
  disqualified_subjects text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_univ_subject_requirements_univ_dept_year
  on public.univ_subject_requirements (univ_id, dept_id, year);

alter table public.univ_subject_requirements enable row level security;

drop policy if exists univ_subject_requirements_select_authenticated on public.univ_subject_requirements;
create policy univ_subject_requirements_select_authenticated on public.univ_subject_requirements
  for select
  using (auth.role() = 'authenticated');
