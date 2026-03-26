# System Architecture 보강 (PRD P1-11~14, P2-6~8 반영)

전체 시스템 설계·데이터 흐름·비용 등은 [`docs/02_SYSTEM_DESIGN.md`](./02_SYSTEM_DESIGN.md)를 따릅니다.  
본 문서는 **DB 스키마 확장**, **Track 1 함수 목록 확장**, **Track 2 RAG 데이터 소스 확장**만 정리합니다.

---

## 1) DB 스키마 (신규·연관 테이블)

### 1.1 `subject_profiles`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| student_id | uuid FK → `students(id)` | 본인 프로필 |
| year | integer | 2027 고정(`check`) |
| korean_subject | text | `언어와매체` \| `화법과작문` |
| math_subject | text | `미적분` \| `기하` \| `확률과통계` |
| science1, science2 | text | 탐구 과목명(과학 슬롯, nullable) |
| social1, social2 | text | 탐구 과목명(사회 슬롯, nullable) |
| second_foreign | text | nullable |
| created_at, updated_at | timestamptz | |

- 마이그레이션: `supabase/migrations/20260327000000_subject_profiles.sql`
- RLS: `auth.uid() = student_id` (본인 데이터만 CRUD)

### 1.2 `univ_subject_requirements`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| univ_id | uuid FK → `universities(id)` | |
| dept_id | uuid FK → `departments(id)` | |
| year | integer | 2027 고정(`check`) |
| required_math | text[] | 필수 수학(허용 목록), null/빈 배열 = 무제한 |
| required_science | text[] | 필수 탐구 과목명 |
| preferred_subjects | jsonb | 우대 과목·가산 |
| disqualified_subjects | text[] | 선택 시 지원 불가 과목/유형 |
| notes | text | 요강 참고 메모 |
| created_at, updated_at | timestamptz | |

- RLS: `authenticated` **SELECT** (참조 데이터). 적재는 서비스 롤/시드 권장.

### 1.3 FK용 참조 테이블 (동일 마이그레이션)

- `universities(id, name, …)` — `univ_subject_requirements.univ_id`
- `departments(id, university_id, name, …)` — `univ_subject_requirements.dept_id`

---

## 2) Track 1 계산 함수 목록 (확장)

위치: `src/lib/calculators/` (순수 함수, LLM/API 호출 금지)

| 함수 | 역할 |
|---|---|
| `checkSubjectEligibility(profile, requirement)` | 선택과목 vs 대학 요건 → `eligible`, `warnings`, `advantages` |
| `analyzeSubjectAdvantage(profile, targetUnivs)` | 목표 대학 배열을 유리/불리/지원불가로 분류 |
| `calcSuneungMinimumProbability(...)` | 모의고사 분포 기반 수능최저 조건 충족 확률(%) (P1-13) |
| `detectGibupGap(...)` | 생기부 항목별 공백·글자수 미달 탐지 (P1-14) |
| `calcDDay(...)` | 기준일 대비 D-Day 정수 산출 (P1-12) |
| `calcSuneungNapchiRisk(...)` | 수시 지원 조합 기준 정시 납치 리스크 등급 (P2-6) |

기존 함수(`calculateSuneungScore`, `calculateSusiGPA`, `calculateZScore`, `calculateAdmissionProbability`, `checkSuneungMinimum` 등)와 동일 원칙을 따릅니다.

---

## 3) Track 2 RAG 데이터 소스 목록 (확장)

`guideline_chunks` 및 향후 전용 인덱스에 포함할 소스 예시:

| 소스 | 용도 |
|---|---|
| 선택과목 지원조건 | 모집요강 PDF (과목 제한·우대·불가) |
| 합격자 평균 스펙 | 대학 공시·통계 (P2-7) |
| N수생 비율 | 대학 입학처 공시 (P2-8) |

메타데이터 필터 예: `university_name` / `admission_year` / `admission_type` / `chunk_category`(예: `subject_requirement`, `admission_stats`).
