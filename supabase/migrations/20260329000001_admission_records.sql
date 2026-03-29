-- admission_records: data-collector admission_db.jsonl 적재용
-- Path: supabase/migrations/20260329000001_admission_records.sql

create table if not exists public.admission_records (
  id bigint generated always as identity primary key,
  university text not null,
  year integer not null,
  "전형유형" text not null
    check ("전형유형" in ('학생부교과', '학생부종합', '정시')),
  "전형명" text not null,
  "계열" text,
  "모집인원" integer,
  "반영교과" text,
  "학년별반영비율" text,
  "수능최저" jsonb,
  "입결" jsonb,
  source text,
  created_at timestamptz not null default now(),
  unique (university, year, "전형유형", "전형명", "계열")
);

comment on table public.admission_records is
  'data-collector admission_db.jsonl 등에서 적재하는 전형·입결 참조 데이터';

create index if not exists idx_admission_records_univ_year_type
  on public.admission_records (university, year, "전형유형");

alter table public.admission_records enable row level security;

drop policy if exists admission_records_read_all on public.admission_records;
create policy admission_records_read_all on public.admission_records
  for select using (auth.role() = 'authenticated');
