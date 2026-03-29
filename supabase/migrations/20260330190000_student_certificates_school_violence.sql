-- 자격증·인증, 학교폭력 조치 (docs/08_STUDENT_RECORD_SPEC.md §4.1, §5)

-- ---------------------------------------------------------------------------
-- student_certificates
-- ---------------------------------------------------------------------------
create table public.student_certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  cert_type text not null check (cert_type in ('자격증', '인증')),
  cert_name text not null,
  cert_number text,
  acquired_date date,
  issuer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_certificates_student_id on public.student_certificates (student_id);

comment on table public.student_certificates is 'NEIS 자격증 및 인증 취득상황';

-- ---------------------------------------------------------------------------
-- student_school_violence
-- ---------------------------------------------------------------------------
create table public.student_school_violence (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  decision_date date not null,
  action_detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_school_violence_student_id on public.student_school_violence (student_id);

comment on table public.student_school_violence is 'NEIS 학교폭력 조치사항 (민감, Admin 쓰기)';

-- ---------------------------------------------------------------------------
-- RLS (기존 생활기록부 테이블과 동일 패턴)
-- ---------------------------------------------------------------------------
alter table public.student_certificates enable row level security;
alter table public.student_school_violence enable row level security;

-- student_certificates
drop policy if exists student_certificates_select on public.student_certificates;
create policy student_certificates_select on public.student_certificates
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_certificates_insert_admin on public.student_certificates;
create policy student_certificates_insert_admin on public.student_certificates
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_certificates_update_admin on public.student_certificates;
create policy student_certificates_update_admin on public.student_certificates
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

drop policy if exists student_certificates_delete_admin on public.student_certificates;
create policy student_certificates_delete_admin on public.student_certificates
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_school_violence
drop policy if exists student_school_violence_select on public.student_school_violence;
create policy student_school_violence_select on public.student_school_violence
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_school_violence_insert_admin on public.student_school_violence;
create policy student_school_violence_insert_admin on public.student_school_violence
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_school_violence_update_admin on public.student_school_violence;
create policy student_school_violence_update_admin on public.student_school_violence
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

drop policy if exists student_school_violence_delete_admin on public.student_school_violence;
create policy student_school_violence_delete_admin on public.student_school_violence
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );
