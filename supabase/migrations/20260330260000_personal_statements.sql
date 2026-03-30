-- P1-6 자기소개서 코치 — personal_statements
-- Path: supabase/migrations/20260330260000_personal_statements.sql

create table public.personal_statements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  university text not null,
  question_number integer not null check (question_number between 1 and 4),
  question_text text not null,
  draft_text text not null default '',
  max_length integer not null default 1500
    check (max_length > 0 and max_length <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_statements_student_id
  on public.personal_statements (student_id);

comment on table public.personal_statements is
  'P1-6 자소서 코치: 대학·문항별 초안 저장';

alter table public.personal_statements enable row level security;

drop policy if exists personal_statements_select on public.personal_statements;
create policy personal_statements_select on public.personal_statements
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists personal_statements_insert on public.personal_statements;
create policy personal_statements_insert on public.personal_statements
  for insert with check (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists personal_statements_update on public.personal_statements;
create policy personal_statements_update on public.personal_statements
  for update using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  )
  with check (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists personal_statements_delete on public.personal_statements;
create policy personal_statements_delete on public.personal_statements
  for delete using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );
