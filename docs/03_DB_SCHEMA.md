# DB Schema Design (Supabase PostgreSQL + pgvector)

**현행 요구·로드맵**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md), [`docs/05_ROADMAP.md`](./05_ROADMAP.md)  
(보관 PRD: [`docs/01_PRD.md`](./01_PRD.md)) · 아키텍처 요약: [`docs/02_SYSTEM_DESIGN.md`](./02_SYSTEM_DESIGN.md)

실제 적용 SQL은 아래 마이그레이션(파일명 순)에 포함됩니다:  
`20260325000000_init.sql`, `20260326000000_multi_student.sql`, `20260327000000_subject_profiles.sql`, `20260329000001_admission_records.sql`, `20260329000002_admission_records.sql`, `20260329120000_chat_rag.sql`, `20260329140000_academic_records_neis.sql`, `20260329150000_academic_records_neis_upsert_unique.sql`, `20260329160000_student_record_tables.sql`, `20260329170000_academic_records_fix_unique.sql`, `20260330180000_calendar_events.sql`, `20260330190000_student_certificates_school_violence.sql`, `20260330210000_simulator_portfolios.sql`, `20260330230000_susi_gpa_rules_interview_required.sql`.  
P1-11 확장 테이블 상세는 [`docs/03_DATA_MODEL.md`](./03_DATA_MODEL.md)를 참조합니다. 생활기록부 구조화 테이블은 [`docs/08_STUDENT_RECORD_SPEC.md`](./08_STUDENT_RECORD_SPEC.md)와 본 문서 §2.15를 참조합니다.

## 1) ER 다이어그램

```mermaid
erDiagram
  students {
    uuid id PK "auth.users.id 참조"
    text name
    text role "admin/viewer"
    text[] target_universities
    text target_major
    timestamptz created_at
    timestamptz updated_at
  }

  academic_records {
    bigint id PK
    uuid student_id FK
    text record_type "MOCK_EXAM/SCHOOL_GPA"
    date exam_date
    numeric korean_standard_score
    numeric math_standard_score
    numeric english_standard_score
    numeric sci1_standard_score
    numeric sci2_standard_score
    text semester "NEIS 1-1..3-2"
    text subject_category "general/career_choice/pe_art"
    text subject_name
    numeric total_score
    numeric raw_score
    numeric avg_score
    numeric stddev_score
    integer student_count
    integer credit_unit
    integer class_rank
    integer rank_total
    numeric school_grade
    text achievement_level
  }

  student_records_text {
    bigint id PK
    uuid student_id FK
    smallint grade
    smallint semester
    text subject
    text record_text
  }

  university_scoring_rules {
    bigint id PK
    text university_name
    text major_group
    int admission_year
    numeric korean_ratio
    numeric math_ratio
    numeric english_ratio
    numeric science_ratio
    numeric science_2_bonus
    jsonb english_conversion_table
  }

  susi_gpa_rules {
    bigint id PK
    text university_name
    text admission_type
    int admission_year
    text[] include_subjects
    jsonb career_choice_conversion
    jsonb suneung_minimum
  }

  converted_standard_scores {
    bigint id PK
    text university_name
    text subject_name
    numeric percentile
    numeric converted_score
    int admission_year
  }

  guideline_chunks {
    bigint id PK
    text university_name
    int admission_year
    text admission_type
    text chunk_text
    vector embedding "vector(1536)"
    jsonb metadata
  }

  admission_schedules {
    bigint id PK
    text university_name
    text event_name
    text event_type "수시/정시/공통"
    timestamptz event_date
    text description
    boolean is_completed
  }

  universities {
    uuid id PK
    text name UK
    timestamptz created_at
    timestamptz updated_at
  }

  departments {
    uuid id PK
    uuid university_id FK
    text name
    timestamptz created_at
    timestamptz updated_at
  }

  subject_profiles {
    uuid id PK
    uuid student_id FK
    int year "2027 check"
    text korean_subject
    text math_subject
    text science1
    text science2
    text social1
    text social2
    text second_foreign
    timestamptz created_at
    timestamptz updated_at
  }

  univ_subject_requirements {
    uuid id PK
    uuid univ_id FK
    uuid dept_id FK
    int year "2027 check"
    text[] required_math
    text[] required_science
    jsonb preferred_subjects
    text[] disqualified_subjects
    text notes
    timestamptz created_at
    timestamptz updated_at
  }

  students ||--o{ academic_records : "student_id"
  students ||--o{ student_records_text : "student_id"
  students ||--o{ student_awards : "student_id"
  students ||--o{ student_attendance : "student_id"
  students ||--o{ student_activities : "student_id"
  students ||--o{ student_volunteer : "student_id"
  students ||--o{ student_subject_notes : "student_id"
  students ||--o{ student_reading : "student_id"
  students ||--o{ student_behavior : "student_id"
  students ||--o{ calendar_events : "student_id"
  students ||--o| simulator_portfolios : "student_id unique"
  students ||--o| subject_profiles : "student_id year"
  universities ||--o{ departments : "university_id"
  universities ||--o{ univ_subject_requirements : "univ_id"
  departments ||--o{ univ_subject_requirements : "dept_id"
```

## 2) 테이블별 상세 정의

각 테이블 SQL은 `supabase/migrations/20260325000000_init.sql`에 저장 예정(동일 내용 반영 완료)입니다.

---

### 2.1 `students`

- 목적: 가족 사용자 기본 프로필 및 권한 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | uuid | PK, FK -> auth.users(id), not null | 사용자 식별자 |
| name | text | not null | 이름 |
| role | text | not null, check(admin/viewer) | 역할 |
| target_universities | text[] | not null, default '{}' | 목표 대학 목록 |
| target_major | text | nullable | 목표 전공 |
| created_at | timestamptz | not null, default now() | 생성 시각 |
| updated_at | timestamptz | not null, default now() | 수정 시각 |

```sql
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'viewer')),
  target_universities text[] not null default '{}',
  target_major text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

### 2.2 `academic_records`

- 목적: 모의고사/내신 원천 데이터를 단일 테이블로 저장 (`record_type`으로 구분)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 레코드 식별자 |
| student_id | uuid | FK -> students(id), not null | 학생 식별자 |
| record_type | text | not null, check(MOCK_EXAM/SCHOOL_GPA) | 성적 유형 |
| exam_date | date | not null | 모의고사: 시험일. 내신: 학기 정렬용 기준일(NEIS 학기 코드에 대응) |
| korean_standard_score ~ sci2_grade | numeric/smallint | nullable | 모의고사 영역별 표준점수/백분위/등급 |
| subject_name | text | nullable | 내신 과목명 |
| semester | text | nullable, check(1-1~3-2) | 내신 학년·학기(NEIS) |
| subject_category | text | nullable, check(general/career_choice/pe_art) | 보통교과·진로선택·체육예술 |
| total_score | numeric(6,2) | nullable | 합계(지필+수행 가중합산) |
| raw_score | numeric(5,2) | nullable | 원점수 |
| avg_score | numeric(5,2) | nullable | 평균 |
| stddev_score | numeric(5,2) | nullable | 표준편차 |
| student_count | integer | nullable | 수강자수 |
| credit_unit | integer | nullable | 단위수 |
| class_rank | integer | nullable | 석차(보통교과) |
| rank_total | integer | nullable | 전체 인원(보통교과) |
| school_grade | numeric(3,1) | nullable | 석차등급 |
| achievement_level | text | nullable, check(A~E) | 성취도 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

> `record_type`에 따라 관련 없는 컬럼은 nullable로 유지합니다. 내신(`SCHOOL_GPA`)은 `semester`·`subject_category`에 따라 저장 필드가 달라질 수 있습니다. `class_rank`·`rank_total`은 둘 다 null이거나, 둘 다 있으서 `1 <= class_rank <= rank_total`이어야 합니다.

```sql
create table if not exists public.academic_records (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  record_type text not null check (record_type in ('MOCK_EXAM', 'SCHOOL_GPA')),
  exam_date date not null,
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
```

> 초기 DDL 이후 내신(NEIS)용 컬럼(`semester`, `subject_category`, `total_score`, `class_rank`, `rank_total`)은 `supabase/migrations/20260329140000_academic_records_neis.sql`에서 추가된다.

---

### 2.3 `student_records_text`

- 목적: 학생부종합 RAG 분석용 생기부/세특 원문 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 레코드 식별자 |
| student_id | uuid | FK -> students(id), not null | 학생 식별자 |
| grade | smallint | not null, check(1/2/3) | 학년 |
| semester | smallint | not null, check(1/2) | 학기 |
| subject | text | not null | 과목 |
| record_text | text | not null | 세특 원문 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
create table if not exists public.student_records_text (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  grade smallint not null check (grade in (1, 2, 3)),
  semester smallint not null check (semester in (1, 2)),
  subject text not null,
  record_text text not null,
  created_at timestamptz not null default now()
);
```

---

### 2.4 `university_scoring_rules`

- 목적: 정시 수능 반영 규칙 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 규칙 식별자 |
| university_name | text | not null | 대학명 |
| major_group | text | not null | 계열/모집군 |
| admission_year | integer | not null | 학년도 |
| korean_ratio | numeric(6,3) | not null | 국어 반영비율 |
| math_ratio | numeric(6,3) | not null | 수학 반영비율 |
| english_ratio | numeric(6,3) | not null | 영어 반영비율 |
| science_ratio | numeric(6,3) | not null | 과학 반영비율 |
| science_2_bonus | numeric(6,3) | not null, default 0 | 과탐II 가산점 비율 |
| english_conversion_table | jsonb | not null | 영어 등급별 환산점수 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
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
```

---

### 2.5 `susi_gpa_rules`

- 목적: 학생부교과전형 내신 산출 규칙 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 규칙 식별자 |
| university_name | text | not null | 대학명 |
| admission_type | text | not null, check(학생부교과/학생부종합/논술전형/정시) | 전형명 |
| admission_year | integer | not null | 학년도 |
| include_subjects | text[] | not null, default '{}' | 반영 교과목 목록 |
| career_choice_conversion | jsonb | not null | 진로선택 성취도 환산 |
| suneung_minimum | jsonb | nullable | 수능 최저학력기준 |
| interview_required | boolean | nullable | 면접 필수 여부(P1-16). null=미상 — `20260330230000_susi_gpa_rules_interview_required.sql` |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
create table if not exists public.susi_gpa_rules (
  id bigint generated always as identity primary key,
  university_name text not null,
  admission_type text not null check (admission_type in ('학생부교과', '학생부종합', '논술전형', '정시')),
  admission_year integer not null,
  include_subjects text[] not null default '{}',
  career_choice_conversion jsonb not null,
  suneung_minimum jsonb,
  interview_required boolean,
  created_at timestamptz not null default now(),
  unique (university_name, admission_type, admission_year)
);
```

---

### 2.6 `converted_standard_scores`

- 목적: 수능 후 대학별 탐구영역 변환표준점수표 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 레코드 식별자 |
| university_name | text | not null | 대학명 |
| subject_name | text | not null | 과목명 |
| percentile | numeric(5,2) | not null | 백분위 |
| converted_score | numeric(6,2) | not null | 변환표준점수 |
| admission_year | integer | not null | 학년도 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
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
```

---

### 2.7 `guideline_chunks`

- 목적: RAG 검색용 요강 청크 + 임베딩 벡터 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 청크 식별자 |
| university_name | text | not null | 대학명 |
| admission_year | integer | not null | 학년도 |
| admission_type | text | not null, check(학생부교과/학생부종합/논술전형/정시) | 전형 |
| chunk_text | text | not null | 청크 본문 |
| embedding | vector(1536) | not null | 임베딩 벡터(OpenAI `text-embedding-3-small`, 1536차원) |
| metadata | jsonb | not null, default '{}' | 부가 메타데이터 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
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
```

---

### 2.8 `admission_schedules`

- 목적: 가족 공용 입시 일정 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | 일정 식별자 |
| university_name | text | not null | 대학명 |
| event_name | text | not null | 이벤트명 |
| event_type | text | not null, check(수시/정시/공통) | 이벤트 분류 |
| event_date | timestamptz | not null | 일정 일시 |
| description | text | nullable | 상세 설명 |
| is_completed | boolean | not null, default false | 완료 여부 |
| created_at | timestamptz | not null, default now() | 생성 시각 |

```sql
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
```

---

### 2.9 `universities` (P1-11 FK용)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | 대학 식별자 |
| name | text | not null, unique | 대학명 |
| created_at | timestamptz | not null, default now() | |
| updated_at | timestamptz | not null, default now() | |

- RLS: `authenticated` SELECT (`20260327000000_subject_profiles.sql` 참조)

---

### 2.10 `departments` (P1-11 FK용)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | 모집단위 식별자 |
| university_id | uuid | FK → universities(id), not null | 소속 대학 |
| name | text | not null | 모집단위명 |
| created_at | timestamptz | not null, default now() | |
| updated_at | timestamptz | not null, default now() | |

- 고유: `(university_id, name)`
- RLS: `authenticated` SELECT

---

### 2.11 `subject_profiles` (P1-11)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students(id), not null | |
| year | integer | not null, default 2027, check(year=2027) | |
| korean_subject | text | not null, check | `언어와매체` / `화법과작문` |
| math_subject | text | not null, check | `미적분` / `기하` / `확률과통계` |
| science1, science2 | text | nullable | 탐구(과학 슬롯) 과목명 |
| social1, social2 | text | nullable | 탐구(사회 슬롯) 과목명 |
| second_foreign | text | nullable | |
| created_at, updated_at | timestamptz | not null | |

- 고유: `(student_id, year)`
- RLS: `auth.uid() = student_id` (소유 데이터만 CRUD)

---

### 2.12 `univ_subject_requirements` (P1-11)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| univ_id | uuid | FK → universities(id), not null | |
| dept_id | uuid | FK → departments(id), not null | |
| year | integer | not null, check(year=2027) | |
| required_math | text[] | nullable | 필수 수학 허용 목록 |
| required_science | text[] | nullable | 필수 탐구 과목명 |
| preferred_subjects | jsonb | not null, default `{}` | 우대·가산 |
| disqualified_subjects | text[] | nullable | 지원 불가 과목 |
| notes | text | nullable | |
| created_at, updated_at | timestamptz | not null | |

- RLS: `authenticated` SELECT (참조 데이터)

---

### 2.13 `admission_records` (data-collector 적재)

- 목적: data-collector `admission_db.jsonl` 등에서 입결·경쟁률 스냅샷 적재(PRD 매뉴얼 §3 신호등, §6 전국 탐색기)
- 고유: `(univ_name, dept_name, admission_type, year)`

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | bigint | PK, identity | |
| univ_name | text | not null | 대학명 |
| dept_name | text | not null | 모집단위(학과·계열 등) |
| admission_type | text | not null, check | `학생부교과` / `학생부종합` / `정시` |
| year | integer | not null | 입시 연도(모집 연도 등) |
| cutoff_score | numeric | nullable | 컷라인·환산 등 입결 지표 |
| competition_ratio | numeric | nullable | 경쟁률 |
| med_shift_coeff | numeric | nullable | 의치한 확장 등 컷 조정 계수 |
| source | text | not null, default `admission_db.jsonl` | 출처 식별 |
| created_at | timestamptz | not null, default now() | |

- 인덱스: `(univ_name, year, admission_type)`
- RLS: 활성화 — `authenticated` **SELECT** (`admission_records_select_authenticated`); **INSERT/UPDATE/DELETE**는 `students.role = 'admin'`인 동일 `auth.uid()`만 (`admission_records_*_admin`)

DDL: `supabase/migrations/20260329000002_admission_records.sql` (`20260329000001` 초안 테이블은 본 마이그레이션에서 `drop` 후 재생성)

---

### 2.15 NEIS 생활기록부 구조화 테이블 (`20260329160000_student_record_tables.sql`)

목적·도메인 설명은 [`docs/08_STUDENT_RECORD_SPEC.md`](./08_STUDENT_RECORD_SPEC.md)와 정합한다.  
공통 FK: `student_id` → `students(id)` ON DELETE CASCADE. 공통 PK: `id uuid` default `gen_random_uuid()`, `created_at timestamptz`가 있는 테이블은 마이그레이션 정의를 따른다.

**적재 스크립트:** `scripts/ingest/load_student_record.ts` — 입력 `record/student_record.json` 최상위 키 `attendance`, `awards`, `activities`, `volunteer`, `subject_notes`, `reading`, `behavior` → 각 테이블 insert/upsert. 환경: `SUPABASE_SERVICE_ROLE_KEY` 등(스크립트 주석 참조).

#### `student_awards` (수상경력, 다건)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | 학년 |
| semester | integer | not null, check(1,2) | 학기 |
| award_name | text | not null | 수상명 |
| rank | text | nullable | |
| award_date | date | nullable | |
| organization | text | nullable | |
| participants | text | nullable | |
| created_at | timestamptz | not null, default now() | |

#### `student_attendance` (출결상황, 학년당 1행)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | 학년 |
| school_days | integer | nullable | 수업일수 |
| absence_illness / absence_unauthorized / absence_other | integer | not null, default 0 | 결석 |
| late_illness / late_unauthorized / late_other | integer | not null, default 0 | 지각 |
| early_leave_illness / early_leave_unauthorized / early_leave_other | integer | not null, default 0 | 조퇴 |
| result_illness / result_unauthorized / result_other | integer | not null, default 0 | 결과 |
| note | text | nullable | 비고 |

- **고유**: `unique (student_id, grade)`

#### `student_activities` (창의적 체험활동: 자율·동아리·진로)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| activity_type | text | not null | `자율활동` / `동아리활동` / `진로활동` |
| hours | integer | nullable | |
| hope_field | text | nullable | 진로활동에만 해당 |
| content | text | not null | 활동 내용 |

- **고유**: `unique (student_id, grade, activity_type)`

#### `student_volunteer` (봉사활동, 다건)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| period | text | not null | 기간 |
| organization | text | not null | 장소/기관 |
| activity | text | not null | 활동 내용 |
| hours | integer | not null | 시간 |
| cumulative_hours | integer | nullable | 누계 |

#### `student_subject_notes` (세부능력 및 특기사항)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| semester | integer | not null, check(1,2) | |
| subject_name | text | not null | 과목명 |
| note | text | not null | 세특 본문 |

- **고유**: `unique (student_id, grade, semester, subject_name)`

#### `student_reading` (독서활동, 다건)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| subject_area | text | nullable | 영역 |
| content | text | nullable | 독서 내용 |

#### `student_behavior` (행동특성 및 종합의견, 학년당 1행)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| content | text | not null | 종합의견 본문 |

- **고유**: `unique (student_id, grade)`

#### `student_certificates` (자격증·인증, 다건) — `20260330190000_student_certificates_school_violence.sql`

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| cert_type | text | not null | `자격증` / `인증` |
| cert_name | text | not null | |
| cert_number | text | nullable | |
| acquired_date | date | nullable | |
| issuer | text | nullable | |
| created_at | timestamptz | not null, default now() | |

#### `student_school_violence` (학교폭력 조치, 다건) — 동일 마이그레이션

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| student_id | uuid | FK → students, not null | |
| grade | integer | not null, check(1,2,3) | |
| decision_date | date | not null | 조치결정 일자 |
| action_detail | text | not null | 조치사항 |
| created_at | timestamptz | not null, default now() | |

**RLS (§2.15에 기술된 생활기록부 구조화 테이블 전부 공통)**

- **SELECT**: `auth.uid() = student_id` **또는** `exists (select 1 from students s where s.id = auth.uid() and s.role = 'admin')` — 본인 행 읽기 + **admin** 전 행 읽기.
- **INSERT / UPDATE / DELETE**: `exists (select 1 from students s where s.id = auth.uid() and s.role = 'admin')` — `admission_records` admin 쓰기와 동일 패턴.

비고: `service_role` 등 RLS 우회 키는 Supabase 기본 동작을 따른다.

---

### 2.16 `simulator_portfolios` (P1-7 원서 배분 시뮬레이터) — `20260330210000_simulator_portfolios.sql`

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` | |
| student_id | uuid | FK → `students(id)` ON DELETE CASCADE, not null | |
| cards | jsonb | not null, default `[]` | 저장 카드(JSON). API·앱과 동일 스키마 |
| created_at | timestamptz | not null, default now() | |

- **고유**: `unique (student_id)`
- **인덱스**: `(student_id)`
- **RLS**: SELECT/INSERT/UPDATE/DELETE — `auth.uid() = student_id`

### 2.17 `chat_usage_daily` (AI 챗봇 일일 호출)

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| user_id | uuid | PK 일부, FK → `auth.users(id)` | 사용자 |
| usage_date | date | PK 일부 | UTC 기준 일자 |
| call_count | int | not null | 해당 일 `POST /api/chat` 성공 시도당 1 증가 |

- **쓰기**: RPC `try_consume_chat_quota`만 사용(SECURITY DEFINER). 클라이언트 직접 INSERT/UPDATE 없음.
- **RLS**: 본인 `user_id`만 SELECT.

### RAG RPC (`20260329120000_chat_rag.sql`)

- **`match_guideline_chunks(query_embedding vector(1536), match_count int, filter jsonb default '{}', match_threshold double precision default 0.75)`**  
  반환: `id bigint`, `chunk_text`, `metadata`, `similarity`(코사인 유사도 `1 - (embedding <=> query_embedding)`). `guideline_chunks`에서 `metadata @> coalesce(filter,'{}')`이고 유사도가 `coalesce(match_threshold, 0.75)` **이상**인 행만, `embedding <=> query_embedding` **거리 오름차순**, `limit`는 `greatest(1, least(coalesce(match_count,5), 50))`. (`20260329140000_match_guideline_chunks_threshold.sql`)
- **`try_consume_chat_quota(p_limit int)`**  
  UTC 오늘 기준 `call_count`를 원자적으로 확인 후 한도 미만이면 +1, 반환 JSON `{ ok, used, code? }`.

---

## 3) pgvector 설정 및 인덱스

```sql
create extension if not exists vector;
```

`guideline_chunks` 벡터 검색 인덱스:

```sql
create index if not exists guideline_chunks_embedding_hnsw_idx
  on public.guideline_chunks using hnsw (embedding vector_cosine_ops);
```

추가 메타 인덱스:

```sql
create index if not exists idx_guideline_chunks_meta
  on public.guideline_chunks(university_name, admission_year, admission_type);
```

HNSW 선택 이유(요약):
- IVFFlat 대비 근사 최근접 탐색 정확도가 높고, 소규모-중규모 문서셋에서 질의 품질이 안정적입니다.
- 초기 인덱스 생성 비용은 더 들 수 있으나, 본 프로젝트는 조회 정확도를 우선합니다.

## 4) RLS(Row Level Security) 정책

아래 정책 SQL은 `supabase/migrations/20260325000000_init.sql`에 포함됩니다.

```sql
alter table public.students enable row level security;
alter table public.academic_records enable row level security;
alter table public.student_records_text enable row level security;
alter table public.university_scoring_rules enable row level security;
alter table public.susi_gpa_rules enable row level security;
alter table public.converted_standard_scores enable row level security;
alter table public.guideline_chunks enable row level security;
alter table public.admission_schedules enable row level security;

-- students: 본인 row만 조회/수정 가능
create policy students_select_own on public.students
  for select using (auth.uid() = id);
create policy students_update_own on public.students
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
create policy students_insert_self on public.students
  for insert with check (auth.uid() = id);

-- academic_records: 본인 student_id row만 접근
create policy academic_records_select_own on public.academic_records
  for select using (auth.uid() = student_id);
create policy academic_records_insert_own on public.academic_records
  for insert with check (auth.uid() = student_id);
create policy academic_records_update_own on public.academic_records
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
create policy academic_records_delete_own on public.academic_records
  for delete using (auth.uid() = student_id);

-- student_records_text: 본인 student_id row만 접근
create policy student_records_text_select_own on public.student_records_text
  for select using (auth.uid() = student_id);
create policy student_records_text_insert_own on public.student_records_text
  for insert with check (auth.uid() = student_id);
create policy student_records_text_update_own on public.student_records_text
  for update using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
create policy student_records_text_delete_own on public.student_records_text
  for delete using (auth.uid() = student_id);

-- 공용 테이블: 로그인 사용자 read-only
create policy university_scoring_rules_read_all on public.university_scoring_rules
  for select using (auth.role() = 'authenticated');
create policy susi_gpa_rules_read_all on public.susi_gpa_rules
  for select using (auth.role() = 'authenticated');
create policy converted_standard_scores_read_all on public.converted_standard_scores
  for select using (auth.role() = 'authenticated');
create policy guideline_chunks_read_all on public.guideline_chunks
  for select using (auth.role() = 'authenticated');
create policy admission_schedules_read_all on public.admission_schedules
  for select using (auth.role() = 'authenticated');
```

## 5) 마이그레이션 파일 안내

- `supabase/migrations/20260325000000_init.sql` — 초기 스키마 + 8개 테이블 + RLS
- `supabase/migrations/20260326000000_multi_student.sql` — students 컬럼·RLS 보강
- `supabase/migrations/20260327000000_subject_profiles.sql` — `universities`, `departments`, `subject_profiles`, `univ_subject_requirements` + RLS
- `supabase/migrations/20260329000001_admission_records.sql` — `admission_records` 초안(후속 `00002`에서 스키마 교체)
- `supabase/migrations/20260329000002_admission_records.sql` — W3-A1 `admission_records` + RLS (authenticated SELECT, admin 쓰기)
- `supabase/migrations/20260329120000_chat_rag.sql` — `chat_usage_daily`, `match_guideline_chunks`, `try_consume_chat_quota`
- `supabase/migrations/20260329140000_academic_records_neis.sql` — 내신(NEIS)용 `semester`, `subject_category`, `total_score`, `class_rank`, `rank_total` 등
- `supabase/migrations/20260329150000_academic_records_neis_upsert_unique.sql` — `SCHOOL_GPA` 행용 부분 유니크 인덱스 초안(후속 `29170000`에서 제거 — `ON CONFLICT`와 비호환)
- `supabase/migrations/20260329160000_student_record_tables.sql` — NEIS 생활기록부 구조화 7테이블 + RLS (`student_awards`, `student_attendance`, `student_activities`, `student_volunteer`, `student_subject_notes`, `student_reading`, `student_behavior`)
- `supabase/migrations/20260330190000_student_certificates_school_violence.sql` — `student_certificates`, `student_school_violence` + RLS
- `supabase/migrations/20260329170000_academic_records_fix_unique.sql` — `academic_records_upsert_key` `UNIQUE (student_id, semester, subject_name, credit_unit)` (`scripts/ingest/load_neis_grades.ts` upsert)

## 6) 초기 시드 데이터(Seed Data) 안내

- 파일 경로: `supabase/seed.sql`
- 포함 데이터:
  - `university_scoring_rules`: 서강대/성균관대/한양대 2026 샘플
  - `susi_gpa_rules`: 서강대/성균관대/한양대 2026 샘플
- 주의:
  - 실제 요강 수치 확인이 필요한 항목에 `-- TODO: 요강 확인 필요` 주석 포함
  - `ON CONFLICT ... DO UPDATE`로 재실행 가능하게 구성

## 7) PRD v2 연계 (설계·마이그레이션 예정)

다음은 [`docs/05_ROADMAP.md`](./05_ROADMAP.md) §1에 따른 **문서·DDL 확정 전** 메모이다. 구현 시 본 절과 [`docs/03_DATA_MODEL.md`](./03_DATA_MODEL.md)를 함께 갱신한다.

1. **`university_scoring_rules` vs 규칙 확장**  
   data-collector `admission_db.json`(18개 대학 구조화 규칙)을 **기존 테이블 확장**으로 흡수할지, 별도 **`admission_rules`(가칭)** 테이블로 둘지 결정 후 단일 소스 원칙을 문서화한다.

2. **199개 대학 입결·경쟁률**  
   P0-4 전체 스캔·P1-15·P2-9용 데이터를 **Supabase 테이블**로 적재할지, **앱 번들 JSON + 주기적 동기화**할지 선택하고 RLS(참조 데이터 read-only)를 정한다.

3. **`university_search_index` (가칭)**  
   P1-16 조건 필터·탐색 가속을 위한 **뷰 또는 테이블** — 전형계획 파싱 필드(수능최저 유무, 면접 유무 등)와 입결 키를 조인하는 형태로 정의(상세: `03_DATA_MODEL.md`).

4. **인증·RLS**  
   PRD v2 이메일 가입·사용자별 격리에 맞춰 `students` 및 사용자 소유 테이블 정책을 재검토한다.

