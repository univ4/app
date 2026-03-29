-- P1-7: 수시 6장 원서 배분 시뮬레이터 저장용
-- Path: supabase/migrations/20260330210000_simulator_portfolios.sql

create table if not exists public.simulator_portfolios (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint simulator_portfolios_student_id_key unique (student_id)
);

comment on table public.simulator_portfolios is
  'P1-7 원서 배분 시뮬레이터: 학생별 카드 목록(JSON)';

create index if not exists idx_simulator_portfolios_student_id
  on public.simulator_portfolios (student_id);

alter table public.simulator_portfolios enable row level security;

drop policy if exists simulator_portfolios_select_own on public.simulator_portfolios;
create policy simulator_portfolios_select_own on public.simulator_portfolios
  for select using (auth.uid() = student_id);

drop policy if exists simulator_portfolios_insert_own on public.simulator_portfolios;
create policy simulator_portfolios_insert_own on public.simulator_portfolios
  for insert with check (auth.uid() = student_id);

drop policy if exists simulator_portfolios_update_own on public.simulator_portfolios;
create policy simulator_portfolios_update_own on public.simulator_portfolios
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists simulator_portfolios_delete_own on public.simulator_portfolios;
create policy simulator_portfolios_delete_own on public.simulator_portfolios
  for delete using (auth.uid() = student_id);
