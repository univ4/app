-- NEIS 생활기록부 구조화 테이블 (docs/08_STUDENT_RECORD_SPEC.md)
-- RLS: authenticated — 본인 student_id 행 읽기 + admin은 전체 읽기; INSERT/UPDATE/DELETE — admin만

-- ---------------------------------------------------------------------------
-- 1) student_awards (수상경력)
-- ---------------------------------------------------------------------------
create table public.student_awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  semester integer not null check (semester in (1, 2)),
  award_name text not null,
  rank text,
  award_date date,
  organization text,
  participants text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_awards_student_id on public.student_awards (student_id);

comment on table public.student_awards is 'NEIS 수상경력 (학년·학기별 다건)';

-- ---------------------------------------------------------------------------
-- 2) student_attendance (출결상황, 학년당 1행)
-- ---------------------------------------------------------------------------
create table public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  school_days integer,
  absence_illness integer not null default 0,
  absence_unauthorized integer not null default 0,
  absence_other integer not null default 0,
  late_illness integer not null default 0,
  late_unauthorized integer not null default 0,
  late_other integer not null default 0,
  early_leave_illness integer not null default 0,
  early_leave_unauthorized integer not null default 0,
  early_leave_other integer not null default 0,
  result_illness integer not null default 0,
  result_unauthorized integer not null default 0,
  result_other integer not null default 0,
  note text,
  constraint student_attendance_student_grade unique (student_id, grade)
);

create index if not exists idx_student_attendance_student_id on public.student_attendance (student_id);

comment on table public.student_attendance is 'NEIS 출결상황 (학년별 1행)';

-- ---------------------------------------------------------------------------
-- 3) student_activities (창의적 체험활동: 자율·동아리·진로)
-- ---------------------------------------------------------------------------
create table public.student_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  activity_type text not null
    check (activity_type in ('자율활동', '동아리활동', '진로활동')),
  hours integer,
  hope_field text,
  content text not null,
  constraint student_activities_student_grade_type unique (student_id, grade, activity_type)
);

create index if not exists idx_student_activities_student_id on public.student_activities (student_id);

comment on table public.student_activities is 'NEIS 창의적 체험활동 (학년×영역 1셀)';
comment on column public.student_activities.hope_field is '진로활동에만 해당';

-- ---------------------------------------------------------------------------
-- 4) student_volunteer (봉사활동)
-- ---------------------------------------------------------------------------
create table public.student_volunteer (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  period text not null,
  organization text not null,
  activity text not null,
  hours integer not null,
  cumulative_hours integer
);

create index if not exists idx_student_volunteer_student_id on public.student_volunteer (student_id);

comment on table public.student_volunteer is 'NEIS 봉사활동 실적 (다건)';

-- ---------------------------------------------------------------------------
-- 5) student_subject_notes (세부능력 및 특기사항)
-- ---------------------------------------------------------------------------
create table public.student_subject_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  semester integer not null check (semester in (1, 2)),
  subject_name text not null,
  note text not null,
  constraint student_subject_notes_student_grade_sem_subject unique (student_id, grade, semester, subject_name)
);

create index if not exists idx_student_subject_notes_student_id on public.student_subject_notes (student_id);

comment on table public.student_subject_notes is 'NEIS 교과 세부능력 및 특기사항';

-- ---------------------------------------------------------------------------
-- 6) student_reading (독서활동)
-- ---------------------------------------------------------------------------
create table public.student_reading (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  subject_area text,
  content text
);

create index if not exists idx_student_reading_student_id on public.student_reading (student_id);

comment on table public.student_reading is 'NEIS 독서활동상황';

-- ---------------------------------------------------------------------------
-- 7) student_behavior (행동특성 및 종합의견)
-- ---------------------------------------------------------------------------
create table public.student_behavior (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  grade integer not null check (grade in (1, 2, 3)),
  content text not null,
  constraint student_behavior_student_grade unique (student_id, grade)
);

create index if not exists idx_student_behavior_student_id on public.student_behavior (student_id);

comment on table public.student_behavior is 'NEIS 행동특성 및 종합의견 (학년별 1행)';

-- ---------------------------------------------------------------------------
-- Row Level Security (동일 패턴 × 7)
-- SELECT: 본인 student_id 또는 students.role = admin 인 사용자
-- 쓰기: admin만 (admission_records 와 동일한 서브쿼리)
-- ---------------------------------------------------------------------------

alter table public.student_awards enable row level security;
alter table public.student_attendance enable row level security;
alter table public.student_activities enable row level security;
alter table public.student_volunteer enable row level security;
alter table public.student_subject_notes enable row level security;
alter table public.student_reading enable row level security;
alter table public.student_behavior enable row level security;

-- student_awards
drop policy if exists student_awards_select on public.student_awards;
create policy student_awards_select on public.student_awards
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_awards_insert_admin on public.student_awards;
create policy student_awards_insert_admin on public.student_awards
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_awards_update_admin on public.student_awards;
create policy student_awards_update_admin on public.student_awards
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

drop policy if exists student_awards_delete_admin on public.student_awards;
create policy student_awards_delete_admin on public.student_awards
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_attendance
drop policy if exists student_attendance_select on public.student_attendance;
create policy student_attendance_select on public.student_attendance
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_attendance_insert_admin on public.student_attendance;
create policy student_attendance_insert_admin on public.student_attendance
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_attendance_update_admin on public.student_attendance;
create policy student_attendance_update_admin on public.student_attendance
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

drop policy if exists student_attendance_delete_admin on public.student_attendance;
create policy student_attendance_delete_admin on public.student_attendance
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_activities
drop policy if exists student_activities_select on public.student_activities;
create policy student_activities_select on public.student_activities
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_activities_insert_admin on public.student_activities;
create policy student_activities_insert_admin on public.student_activities
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_activities_update_admin on public.student_activities;
create policy student_activities_update_admin on public.student_activities
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

drop policy if exists student_activities_delete_admin on public.student_activities;
create policy student_activities_delete_admin on public.student_activities
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_volunteer
drop policy if exists student_volunteer_select on public.student_volunteer;
create policy student_volunteer_select on public.student_volunteer
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_volunteer_insert_admin on public.student_volunteer;
create policy student_volunteer_insert_admin on public.student_volunteer
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_volunteer_update_admin on public.student_volunteer;
create policy student_volunteer_update_admin on public.student_volunteer
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

drop policy if exists student_volunteer_delete_admin on public.student_volunteer;
create policy student_volunteer_delete_admin on public.student_volunteer
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_subject_notes
drop policy if exists student_subject_notes_select on public.student_subject_notes;
create policy student_subject_notes_select on public.student_subject_notes
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_subject_notes_insert_admin on public.student_subject_notes;
create policy student_subject_notes_insert_admin on public.student_subject_notes
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_subject_notes_update_admin on public.student_subject_notes;
create policy student_subject_notes_update_admin on public.student_subject_notes
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

drop policy if exists student_subject_notes_delete_admin on public.student_subject_notes;
create policy student_subject_notes_delete_admin on public.student_subject_notes
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_reading
drop policy if exists student_reading_select on public.student_reading;
create policy student_reading_select on public.student_reading
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_reading_insert_admin on public.student_reading;
create policy student_reading_insert_admin on public.student_reading
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_reading_update_admin on public.student_reading;
create policy student_reading_update_admin on public.student_reading
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

drop policy if exists student_reading_delete_admin on public.student_reading;
create policy student_reading_delete_admin on public.student_reading
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- student_behavior
drop policy if exists student_behavior_select on public.student_behavior;
create policy student_behavior_select on public.student_behavior
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_behavior_insert_admin on public.student_behavior;
create policy student_behavior_insert_admin on public.student_behavior
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_behavior_update_admin on public.student_behavior;
create policy student_behavior_update_admin on public.student_behavior
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

drop policy if exists student_behavior_delete_admin on public.student_behavior;
create policy student_behavior_delete_admin on public.student_behavior
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );
