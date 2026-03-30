# System Architecture 보강 (PRD v2 · P1-11~17, P2-6~12, P3-4·P3-6)

**근거**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) · **로드맵**: [`docs/05_ROADMAP.md`](./05_ROADMAP.md)

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
| `calcSubjectAdvantage(params)` | 정시 `math_ratio`·과탐Ⅱ 가산 기준 유리/불리/중립(지원 불가 대학 제외) — P1-11 UI·`GET /api/subject-analysis` |
| `calcSuneungMinimumProbability(...)` | 모의고사 분포 기반 수능최저 조건 충족 확률(%) (P1-13) |
| `detectGibupGap(...)` | 생기부 항목별 공백·글자수 미달 탐지 (P1-14) |
| `calcDDay(...)` | 기준일 대비 D-Day 정수 산출 (P1-12) |
| `calcSchoolLevel(...)` | 과목별 Z 평균·밴드(상·중·하위권 참고) — P1-2 고교 내 상대 위치 참고, `GET /api/scores/zscore` |
| `calcAdmissionTodos(...)` / `aggregateAdmissionTodosFromCalendarEvents(...)` | 입시 일정 유형·남은 일수 기준 역산 TO-DO 템플릿 (P1-12) |
| `calcSuneungNapchiRisk(...)` | 수시 지원 조합 기준 정시 납치 리스크 등급 (P2-6) |
| `scanAdmissionSignals(...)` *(가칭)* | 199개 대학·전형 배치 합격 신호등 산출 (P0-4 전체 스캔, P1-15 핵심) |
| `filterUniversitiesByAdmissionCriteria(...)` *(가칭)* | 수능최저/면접/교과 반영 등 AND 조건 필터 (P1-16) |
| `summarizeCutoffTrends(...)` *(가칭)* | 연도별 컷오프 추이 지표 (P2-9) |
| `evaluateJeonsiGroupPortfolio(...)` *(가칭)* | 가·나·다군 조합 리스크·패턴 (P2-10) |
| `simulateScience2BonusImpact(...)` *(가칭)* | 과탐II 가산 시뮬 (P3-4) |

이름은 구현 시 모듈 분할에 맞게 조정한다. 기존 함수(`calculateSuneungScore`, `calculateSusiGPA`, `calculateZScore`, `calcSchoolLevel`, `calculateAdmissionProbability`, `checkSuneungMinimum` 등)와 동일 원칙을 따른다.

**규칙 데이터**: 정시 환산 등은 data-collector 산출 `admission_db.json`( 및 동기화 테이블)에서 로드 — PRD v2 P0-2, [`docs/03_DB_SCHEMA.md`](./03_DB_SCHEMA.md) §PRD v2 연계.

---

## 3) Track 2 RAG 데이터 소스 목록 (확장)

`guideline_chunks` 및 향후 전용 인덱스에 포함할 소스 예시:

| 소스 | 용도 |
|---|---|
| 전형계획 Markdown | **18개 대학** 2027학년도 (수능반영·최저·교과규칙 등) — PRD v2 §11 |
| 정시자료 Markdown | **4개** (서울권·수도권·전문대·총론) — P1-1 RAG, P2-10·P3-4 해석 보조 |
| 선택과목 지원조건 | 모집요강 PDF (과목 제한·우대·불가) |
| 합격자 평균 스펙 | 대학 공시·통계 (P2-7) |
| N수생 비율 | 대학 입학처 공시 (P2-8) |

메타데이터 필터 예: `university_name` / `admission_year` / `admission_type` / `chunk_category`(예: `subject_requirement`, `admission_stats`, `jeonsi_material`, `admission_plan_2027`).

**입결·경쟁률(199개)** 는 RAG가 아니라 Track 1 집계·DB·번들 JSON 등 **결정론적 소스**로 다루는 것이 원칙이다 (P1-15, P2-9).
