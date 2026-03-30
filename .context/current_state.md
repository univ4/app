# Current State (Week 4 완료 · 2026-03-30)

## 문서 정본

- **PRD**: `docs/01_PRD_v2.md` · **로드맵(단일 정본)**: `docs/05_ROADMAP.md`  
- **테스트·사용자 문서(순번):** `docs/06_TEST_PLAN.md` → `docs/07_TEST_SPEC.md` → `docs/08_USER_MANUAL.md` · **모바일**: `docs/08_MOBILE_UI.md`  
- **사용자 매뉴얼 P0–P1 경로 동기화:** `docs/08_USER_MANUAL.md` (2026-03-30).
- `docs/` 하위 설계·API·스키마·테스트·AI 파이프라인 문서는 위 문서를 상단 인용하도록 동기화됨.

## Cursor rules (요약)

- `00_project_overview.mdc`: 수험생·학부모 AI 대입 전략 플랫폼; Data coverage(199 / 18); Out of Scope는 PRD v2 5.2와 동일.
- `02_architecture.mdc`: Two-Track, `admission_records`·data-collector, ingest, 핵심 테이블 목록(`guideline_chunks`, **`student_record_chunks`**, `calendar_events`, `simulator_portfolios`, 생활기록부 구조화 테이블 포함), Track 1에 `calcSchoolLevel`(P1-2)·`calcAdmissionSignal`·`calcAdmissionTrend`(P2-9)·`calcPortfolioRisk`·`calcNapchiRisk`·`calcRecordGapAnalysis`/`detectGibupGap`(P1-14)·`calcAdmissionTodos`(P1-12)·`calcRealCompetitionRate`(P1-3) 명시.
- `04_domain_knowledge.mdc`: Target University Universe(199·18·P1-15·P0-4).
- `05_change_protocol.mdc`: 문서 선행·연쇄 갱신(마이그레이션 시 `03_DATA_MODEL`+`03_DB_SCHEMA`+`current_state`); **마이그레이션과 `03_DATA_MODEL.md` 동시 커밋·커밋 메시지에 `docs: 03_DATA_MODEL.md 업데이트`**(CI 문서 싱크); 계산기/API 체크리스트; calculators **≥90%**·신규 API 구문 **≥70%**·`[id]` PUT/DELETE 성공 테스트 1건 이상; **완료 전 로컬 CI**: `tsc --noEmit` → `lint` → `npm test` → `build`; API route 테스트는 `NextRequest`(`next/server`)·`new Request()` 금지; 완료 보고에 커버리지·미커버 구간; **<90% calculators / <50% 신규 API** 시 완료 불가 또는 최소 테스트 추가; Supabase 모킹은 `jest.mock("@/lib/supabase/server")`+`getAuthUser` (`scores.route.test.ts` 표준).

## Phase

- **Week 1–2:** 기반 설계 + Track 1 계산 엔진 + 테스트 인프라.
- **Week 3 (완료, 2026-03-29):** 입결·RAG 적재 파이프라인, `calcDDay`·`calcSuneungMinimumProbability`, `POST /api/chat`(RAG), 내신 NEIS 스키마·폼.
- **Week 4 (완료, 2026-03-30):** `/login` Suspense, 내신 upsert UNIQUE(`20260329170000`)·적재 49건, 챗봇 E2E(임계 0.55·Bearer·프롬프트·RPC), **P1-1** `/dashboard/chat` UI(SSE·출처·필터), P0-4 신호등·P0-5 캘린더, 생활기록부 9탭+자격증·학폭, 모바일 UI·`08_MOBILE_UI.md`.

## 완료된 핵심 산출물

### Calculators (18개, `src/lib/calculators/`)

- `analyzeSubjectAdvantage.ts`, **`calcSubjectAdvantage.ts`** (P1-11 정시 반영비 유불리), **`calcAdmissionTrend.ts`** (P2-9 연도별 입결 추이), `calculateAdmissionProbability.ts`, `calculateSuneungScore.ts`, `calculateSusiGPA.ts`, `calculateZScore.ts`, **`calcSchoolLevel.ts`** (P1-2 Z·고교 수준 참고)
- `checkSubjectEligibility.ts`, `checkSuneungMinimum.ts`
- `calcDDay.ts`, **`calcAdmissionTodos.ts`** (P1-12 역산 TO-DO), `calcSuneungMinimumProbability.ts`, **`calcAdmissionSignal.ts`** (P0-4 / P1-17 대표 확률)
- **`calcPortfolioRisk.ts`**, **`calcNapchiRisk.ts`** (P1-7 원서 배분 시뮬레이터), **`calcIntegratedStrategy.ts`** (P2-6 수시·정시 통합 전략)
- **`calcRealCompetitionRate.ts`** (P1-3 논술 실질 경쟁률)
- **`calcRecordGapAnalysis.ts`** (P1-14 생기부 공백 탐지, `detectGibupGap` 별칭)

### DB 마이그레이션 (적용 순, `supabase/migrations/`)

| 파일 | 요약 |
|------|------|
| `20260325000000_init.sql` | 초기 스키마·RLS |
| `20260326000000_multi_student.sql` | students 보강 |
| `20260327000000_subject_profiles.sql` | P1-11 선택과목·대학 요건 |
| `20260329000001_admission_records.sql` | admission_records 초안(후속에서 교체) |
| `20260329000002_admission_records.sql` | W3-A1 최종 `admission_records` + RLS |
| `20260329120000_chat_rag.sql` | 챗 한도·`match_guideline_chunks`(초안)·`try_consume_chat_quota` |
| `20260329140000_match_guideline_chunks_threshold.sql` | `match_guideline_chunks` 최종: `filter jsonb`, 유사도 하한, 반환 `id/chunk_text/metadata/similarity` |
| `20260329140000_academic_records_neis.sql` | 내신 NEIS 컬럼 |
| `20260329150000_academic_records_neis_upsert_unique.sql` | 내신 upsert용 부분 유니크(후속 마이그레이션에서 정리) |
| `20260329160000_student_record_tables.sql` | NEIS 생활기록부 구조화 7테이블 + RLS |
| `20260329170000_academic_records_fix_unique.sql` | `academic_records_upsert_key` — `UNIQUE (student_id, semester, subject_name, credit_unit)` (`ON CONFLICT` 정합) |
| `20260330180000_calendar_events.sql` | P0-5 `calendar_events` + RLS + `ensure_default_admission_calendar_2027` |
| `20260330190000_student_certificates_school_violence.sql` | `student_certificates`, `student_school_violence` + RLS |
| `20260330210000_simulator_portfolios.sql` | P1-7 `simulator_portfolios` + RLS (학생당 1행) |
| `20260330230000_susi_gpa_rules_interview_required.sql` | P1-16 `susi_gpa_rules.interview_required` (nullable) |
| `20260330240000_admission_records_nulsul_type.sql` | P1-3 `admission_records.admission_type`에 `논술전형` CHECK 허용 |
| `20260330250000_student_record_chunks.sql` | 생기부 RAG `student_record_chunks` + HNSW + RLS + `match_student_record_chunks` |
| `20260330260000_personal_statements.sql` | P1-6 `personal_statements` + RLS(본인·admin) |
| `20260330270000_mock_interviews.sql` | P1-9 `mock_interviews` + RLS(본인·admin) |

### 대시보드 UI (발췌)

- **P1-1** `src/app/dashboard/chat/page.tsx` — AI 요강 챗봇(`ChatInterface`, `ChatMessage`, `UnivFilter`; `POST /api/chat` SSE)
- **P1-7** `src/app/dashboard/simulator/page.tsx` — 원서 배분 시뮬레이터(`PortfolioBuilder`, `PortfolioSummary`; `GET/POST /api/simulator`)
- **P1-11** `src/app/dashboard/subject-analysis/page.tsx` — 선택과목 분석(`SubjectProfileForm`, `EligibilityResult`, `AdvantageResult`; `GET /api/subject-analysis`, `POST /api/subject-analysis/profile`)
- **P2-9** `src/app/dashboard/trend-analysis/page.tsx` — 입결 추이 분석(`TrendAnalysisClient`, `TrendChart`, `TrendFilter`; `GET /api/trend-analysis`)
- **P1-15·P1-16** `src/app/dashboard/explore/page.tsx` — 전국 대학 탐색(`ExploreClient`, `ExploreFilter`, `ExploreTable`; `GET /api/explore`)
- **P1-3** `src/app/dashboard/nulsul/page.tsx` — 논술 실질 경쟁률(`NulsulDashboardClient`, `NulsulCalculator`, `NulsulCompareTable`; `GET /api/nulsul`)
- **P1-2·P2-11** `src/app/dashboard/scores/page.tsx` — 내신 탭 `ZScoreDisplay`·`GET /api/scores/zscore`, **이미지로 입력** 탭 `ImageUpload`·`POST /api/scores/parse-image`
- **P1-14** `src/app/dashboard/record-check/page.tsx` — 생기부 점검(`RecordCheckResult`, `RecordCheckSummary`; `loadRecordGapAnalysisForStudent`)
- **P1-6** `src/app/dashboard/personal-statement/page.tsx` — 자소서 코치(`PersonalStatementCoach`, `StatementEditor`, `FeedbackView`; `GET/POST /api/personal-statement`, `POST /api/personal-statement/feedback` SSE)

### API routes (`src/app/api/**/route.ts`)

- `api/scores/route.ts`, **`api/scores/zscore/route.ts`** (P1-2), **`api/scores/parse-image/route.ts`** (P2-11 NEIS Vision)
- `api/analysis/probability/route.ts`, `api/analysis/minimum-check/route.ts`
- `api/chat/route.ts`
- **`api/signals/route.ts`**
- **`api/trend-analysis/route.ts`** (P2-9)
- **`api/explore/route.ts`** (P1-15·P1-16)
- **`api/nulsul/route.ts`** (P1-3)
- **`api/subject-analysis/route.ts`**, **`api/subject-analysis/profile/route.ts`** (P1-11)
- **`api/simulator/route.ts`** (P1-7)
- **`api/calendar/route.ts`, `api/calendar/[id]/route.ts`**, **`api/calendar/todos/route.ts`** (P1-12)
- **`api/student-record/*`** (subject-notes, activities, awards, behavior, attendance, volunteer, reading, certificates, school-violence)
- **`api/record-check/route.ts`** (P1-14, `GET` — `calcRecordGapAnalysis`)
- **`api/personal-statement/route.ts`**, **`api/personal-statement/[id]/route.ts`**, **`api/personal-statement/feedback/route.ts`** (P1-6)
- **`api/mock-interview/route.ts`**, **`api/mock-interview/questions/route.ts`**, **`api/mock-interview/feedback/route.ts`** (P1-9)

### Ingest (`scripts/ingest/`)

- `load_admission_db.ts` → `admission_records`
- `embed_student_record.ts` → `student_record_chunks` (순서·환경: `scripts/ingest/README.md`)
- `embed_and_store.ts` → `guideline_chunks`
- `githubReleaseFetch.ts` (GitHub Releases + `GITHUB_TOKEN`)
- `parse_neis_grades.ts`, `load_neis_grades.ts` — UNIQUE 정합 후 내신 JSON 적재(검증 **49**건, 2026-03-30)
- `load_student_record.ts` → 생활기록부 구조화 테이블 (`record/student_record.json`)

### 테스트 (`src/__tests__/`)

- Calculators × 18+, API routes × 8+, lib/chat × 1, calendar 통합 × 1, explore 헬퍼 × 1 — `npm test` 스위트 수는 실행 시 확인

## 데이터 적재 스냅샷 (검증 배치)

- **`admission_records`:** 3,393건 (`load_admission_db.ts`, 2026-03-29)
- **`guideline_chunks`:** 6,256청크 (`embed_and_store.ts`, 2026-03-29)
- **내신 NEIS JSON** (`load_neis_grades.ts`): **49**건 (2026-03-30, `academic_records_upsert_key` 기준)
- **생활기록부 7테이블** (`load_student_record.ts`, 2026-03-29): `student_attendance` 3, `student_awards` 3, `student_activities` 6, `student_volunteer` 14, `student_subject_notes` 23, `student_behavior` 2 (`student_reading` 해당 배치 미적재 또는 0건)

## 테스트·품질 현황

- **Jest:** `jest.config.ts` (next/jest), `testMatch`: `src/__tests__/**/*.test.ts`
- **결과:** **375 tests PASS** / **65 suites** / FAIL 0 (`npm test`, P2-11 `scores-parse-image`·NEIS 매핑 테스트 포함)

## PRD v2 백로그 메모

- **P2-11** 나이스 성적표 이미지 파싱 — 구현: `POST /api/scores/parse-image`, `/dashboard/scores` **이미지로 입력** 탭, `docs/08_USER_MANUAL.md` §2.2.
- **생활기록부 RAG** `student_record_chunks` — 임베딩 적재 후 **P1-5** `POST /api/student-record/analyze`·`/dashboard/hakjong-analysis`로 역량 분석 스트리밍.

## 알려진 미완·주의

- `POST /api/chat` Tool Use → Track 1 브리지는 API 스펙상 후속(`docs/04_API_SPEC.md`).
- P1-12 역산 TO-DO API(`GET /api/dday/todos`) 등 일부 P1 엔드포인트는 스텁·후속 구현 여부는 `docs/04_API_SPEC.md`와 코드 교차 확인.
- Playwright 등 E2E 자동화는 로드맵상 P2 단계 검토.

## Git

- 브랜치/커밋은 로컬에 따라 변동 — 작업 전 `git status` 권장.
