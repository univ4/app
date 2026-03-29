-- P0-5 가족 공용 입시 캘린더 — calendar_events
-- Path: supabase/migrations/20260330180000_calendar_events.sql

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  title text not null,
  event_date date not null,
  event_type text not null
    check (event_type in ('원서접수', '수능', '정시', '면접', '논술', '기타')),
  university text,
  alert_days integer[] not null default array[7, 3, 1, 0]::integer[],
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_student_date
  on public.calendar_events (student_id, event_date);

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_select_own on public.calendar_events;
create policy calendar_events_select_own on public.calendar_events
  for select
  using (auth.role() = 'authenticated' and auth.uid() = student_id);

drop policy if exists calendar_events_insert_admin on public.calendar_events;
create policy calendar_events_insert_admin on public.calendar_events
  for insert
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists calendar_events_update_admin on public.calendar_events;
create policy calendar_events_update_admin on public.calendar_events
  for update
  using (
    auth.uid() = student_id
    and exists (
      select 1
      from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  )
  with check (
    auth.uid() = student_id
    and exists (
      select 1
      from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists calendar_events_delete_admin on public.calendar_events;
create policy calendar_events_delete_admin on public.calendar_events
  for delete
  using (
    auth.uid() = student_id
    and exists (
      select 1
      from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- Idempotent 기본 4건 (ADMISSION_SCHEDULE_2027와 동일 날짜·제목). RLS 우회·호출자 본인 student_id만.
create or replace function public.ensure_default_admission_calendar_2027()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  for rec in
    select *
    from (
      values
        ('수시 원서접수 시작'::text, '2026-09-07'::date, '원서접수'::text, null::text),
        ('수능'::text, '2026-11-12'::date, '수능'::text, null::text),
        ('정시 원서접수 시작'::text, '2027-01-12'::date, '정시'::text, null::text),
        ('최초 합격발표'::text, '2027-02-01'::date, '기타'::text, null::text)
    ) as t (title, event_date, event_type, university)
  loop
    insert into public.calendar_events (
      student_id,
      title,
      event_date,
      event_type,
      university,
      alert_days
    )
    select
      uid,
      rec.title,
      rec.event_date,
      rec.event_type,
      rec.university,
      array[7, 3, 1, 0]::integer[]
    where not exists (
      select 1
      from public.calendar_events c
      where c.student_id = uid
        and c.title = rec.title
        and c.event_date = rec.event_date
    );
  end loop;
end;
$$;

revoke all on function public.ensure_default_admission_calendar_2027() from public;
grant execute on function public.ensure_default_admission_calendar_2027() to authenticated;

comment on table public.calendar_events is
  'P0-5 가족 공용 입시 캘린더 일정(학생 계정 단위). 기본 4건은 ensure_default_admission_calendar_2027()로 삽입.';
