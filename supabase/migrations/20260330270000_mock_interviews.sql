-- P1-9 AI 모의 면접 코치 — mock_interviews
-- Path: supabase/migrations/20260330270000_mock_interviews.sql

create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  target_univ text not null,
  interview_type text not null
    check (interview_type in ('서류기반', 'MMI', '교직인적성')),
  question text not null,
  answer text,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mock_interviews_student_id_created_at
  on public.mock_interviews (student_id, created_at desc);

comment on table public.mock_interviews is
  'P1-9 모의 면접: 질문·답변·피드백 기록';

alter table public.mock_interviews enable row level security;

drop policy if exists mock_interviews_select on public.mock_interviews;
create policy mock_interviews_select on public.mock_interviews
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists mock_interviews_insert on public.mock_interviews;
create policy mock_interviews_insert on public.mock_interviews
  for insert with check (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists mock_interviews_update on public.mock_interviews;
create policy mock_interviews_update on public.mock_interviews
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

drop policy if exists mock_interviews_delete on public.mock_interviews;
create policy mock_interviews_delete on public.mock_interviews
  for delete using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );
