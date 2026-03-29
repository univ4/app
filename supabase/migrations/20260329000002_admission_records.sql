-- W3-A1: admission_records — 합격 신호등·전국 탐색기용 입결 스냅샷 (admission_db.jsonl)
-- Replaces draft shape from 20260329000001 if applied.

drop table if exists public.admission_records cascade;

create table public.admission_records (
  id bigint generated always as identity primary key,
  univ_name text not null,
  dept_name text not null,
  admission_type text not null
    check (admission_type in ('학생부교과', '학생부종합', '정시')),
  year integer not null,
  cutoff_score numeric,
  competition_ratio numeric,
  med_shift_coeff numeric,
  source text not null default 'admission_db.jsonl',
  created_at timestamptz not null default now(),
  constraint admission_records_univ_dept_type_year unique (univ_name, dept_name, admission_type, year)
);

comment on table public.admission_records is
  'data-collector admission_db.jsonl 등에서 적재하는 입결·경쟁률 참조 데이터 (신호등·탐색기)';

comment on column public.admission_records.source is
  '데이터 출처 식별자(기본 admission_db.jsonl)';

create index if not exists idx_admission_records_univ_year_type
  on public.admission_records (univ_name, year, admission_type);

alter table public.admission_records enable row level security;

drop policy if exists admission_records_select_authenticated on public.admission_records;
create policy admission_records_select_authenticated on public.admission_records
  for select using (auth.role() = 'authenticated');

drop policy if exists admission_records_insert_admin on public.admission_records;
create policy admission_records_insert_admin on public.admission_records
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists admission_records_update_admin on public.admission_records;
create policy admission_records_update_admin on public.admission_records
  for update using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists admission_records_delete_admin on public.admission_records;
create policy admission_records_delete_admin on public.admission_records
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );
