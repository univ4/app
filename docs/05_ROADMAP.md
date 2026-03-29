# Development Roadmap (univ4 · 정본)

이 파일(**`docs/05_ROADMAP.md`**)이 저장소 내 **개발·문서 후속 작업의 단일 로드맵**이다. 다른 문서에는 이 로드맵을 **요약·링크**만 두고, 상세 표와 주차 계획은 여기만 갱신한다.

- **요구·우선순위 근거**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) (v1 보관: [`docs/01_PRD.md`](./01_PRD.md))
- **`docs/` 동기화**: 시스템·스키마·API·AI 파이프라인·테스트 문서는 PRD v2 및 본 로드맵을 상단에 인용하도록 정리됨 (2026-03-29 기준).

## 기능 수 요약 (PRD v2)

| 우선순위 | 개수 | 비고 |
|---|---:|---|
| P0 | 5 | MVP 코어 |
| P1 | 17 | +P1-17 합격 확률 %(70% 컷), P1-15/16 등 |
| P2 | 12 | +P2-12 정시 배치표(구 P3-2 통합), P2-9~P2-11 등 |
| P3 | 6 | 구 P3-2→P2-12, 번호 정리(P3-2~P3-4), +P3-6 모의지원(장기) |
| **합계** | **40** | P0+P1+P2+P3 |

---

## 1) 문서 개정 (구현 전 · 즉시)

| 문서 | 작업 내용 |
|---|---|
| [`docs/02_SYSTEM_DESIGN.md`](./02_SYSTEM_DESIGN.md) | P1-15/16/17, P2-9~P2-12, P3-4/6 반영, 199개 대학·`admission_db.json` 데이터 흐름, 비용(Freemium 검토) |
| [`docs/02_SYSTEM_ARCHITECTURE.md`](./02_SYSTEM_ARCHITECTURE.md) | Track 1에 P1-15/16 계산·필터 함수 후보 명시, RAG 소스에 정시자료 Markdown 추가 |
| [`docs/03_DB_SCHEMA.md`](./03_DB_SCHEMA.md) | 규칙 저장소 설계: 기존 `university_scoring_rules`와 **`admission_rules`(가칭) 역할 분리 또는 통합** 결정 후 DDL·RLS 반영 |
| [`docs/03_DATA_MODEL.md`](./03_DATA_MODEL.md) | P1-15 연계 검색용 뷰/테이블(예: `university_search_index` 가칭) — 입결 소스가 DB vs 번들 JSON인지 명시 |
| [`docs/04_API_SPEC.md`](./04_API_SPEC.md) | P0-4 전체 스캔, P1-15/16 등 신규·변경 API 계약 |
| [`docs/05_AI_PIPELINE.md`](./05_AI_PIPELINE.md) | Ingest 대상에 정시자료 Markdown 4종, 메타데이터 태깅 확장 |
| [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md) | P1-15/16 Track 1 경로 테스트 케이스 |
| [`docs/07_TEST_SPEC.md`](./07_TEST_SPEC.md) | P1-15/16 단위 테스트 스펙 |
| [`docs/08_USER_MANUAL.md`](./08_USER_MANUAL.md) | 신규 기능·데이터 파이프라인 반영 시 사용자 안내 갱신 |
| [`docs/08_STUDENT_RECORD_SPEC.md`](./08_STUDENT_RECORD_SPEC.md) | 생활기록부 입력 폼·테이블·RAG 적재 — 구현 시 `03_DATA_MODEL`·`04_API_SPEC`와 동기화 |
| [`.cursor/rules/02_architecture.mdc`](../.cursor/rules/02_architecture.mdc) | Track 1 함수 목록 등 실제와 동기화 시 갱신 |
| [`.context/current_state.md`](../.context/current_state.md) | 진행 중 스프린트·다음 3작업 스냅샷(운영용) |

---

## 2) 구현 로드맵 (문서 개정 후)

### Week 1 — 인프라·데이터·인증

| 작업 | 내용 |
|---|---|
| Auth / RLS | PRD v2: 이메일 인증·사용자별 데이터 격리(기존 가족 스코프와 정합) |
| DB 마이그레이션 | 규칙 테이블 확정 반영, `universities` / `departments` 시드(필요 시) |
| data-collector 연동 | `admission_db.json` → Supabase(또는 빌드 산출물) 적재 스크립트 — **단일 소스** 원칙 유지 |
| RAG 적재 | 전형계획 Markdown 18개 + 정시자료 Markdown 4개 → pgvector (`guideline_chunks`) |

### Week 2 — P0

| 기능 | 작업 |
|---|---|
| P0-1 성적 관리 대시보드 | 입력 폼 + 추이 차트 |
| P0-2 정시 환산점수 | `admission_db.json`(또는 동기화 테이블) 자동 로드 + `calculateSuneungScore()` |
| P0-3 교과 내신 산출 | `calculateSusiGPA()` |
| P0-4 합격 신호등 | 수동 목표 + **199개 전체 스캔**(3초 이내 AC); **P1-17** 합격 확률 %(70% 컷)는 동일 UI 스프린트에서 병행 |
| P0-5 캘린더 | 일정 CRUD + 알림(다중 사용자 시 공유 모델 정의) |

### Week 3 — P1 핵심 (밀도 높음 · 필요 시 2주 분할)

Track 1·데이터 경로를 먼저 안정화한 뒤 UI·RAG를 붙인다.

| 기능 | 작업 |
|---|---|
| P1-15 전국 대학 탐색기 | 199개 대학 필터·신호등 엔진 |
| P1-16 조건부 필터링 | 수능최저/면접/교과 등 AND 필터 |
| P1-11 선택과목 분석기 | `checkSubjectEligibility()` + UI |
| P1-12 D-Day 캘린더 | `calcDDay()` + TO-DO |
| P1-13 수능최저 충족 확률 | `calcSuneungMinimumProbability()` |
| P1-1 RAG 챗봇 | pgvector + Claude(Tool Use) — **병렬 시** 리스크 관리 |

**Week 3 진행 스냅샷 (2026-03-29):** `admission_records`·`guideline_chunks` 적재 스크립트 동작 확인, `calcDDay`·`calcSuneungMinimumProbability`·`POST /api/chat`(RAG) 구현·테스트 통과.

**Week 4 완료 스냅샷 (2026-03-30):** P0 **5/5** 코어 UI·API 정합 — P0-4 신호등(`calcAdmissionSignal`, `GET /api/signals`), P0-5 캘린더(`calendar_events`, `/api/calendar`), **P1-1** 요강 챗봇 UI(`/dashboard/chat`), 챗봇 RAG E2E·임계값·인증, 내신 UNIQUE/적재(49건), 생활기록부 9탭·자격증·학교폭력 테이블, 모바일 가이드 [`docs/08_MOBILE_UI.md`](./08_MOBILE_UI.md). Jest **185** / suites **19**.

### Week 4 이후 — P1 나머지 · P2 · P3

| 기능 | 작업 |
|---|---|
| P1-2 | Z점수 — `calculateZScore()` |
| P1-3 | 논술 **실질 경쟁률** — PRD 수식 전용 계산 모듈(수시 납치 `calcSuneungNapchiRisk`와 별개) |
| P1-4 ~ P1-10, P1-14 | 세특 Gap, 자소서 코치, 원서 배분 시뮬 등 PRD 순 |
| P1-14 | `detectGibupGap()` + UI |
| P1-17 | 합격 확률 %(70% 컷) — `calcAdmissionSignal` 대표 확률(0.85/0.70/0.40)이 신호등 UI·`GET /api/signals`에 반영됨(2026-03-30); 세부 튜닝·표시 문구는 후속 |
| P2-6 ~ P2-8 | 통합 전략 뷰, 합격자 스펙, N수생 분석 |
| P2-9 | 어디가 연도별 입결 추이 시각화 |
| P2-10 | 정시자료 기반 가·나·다군 패턴 |
| P2-11 | 나이스 성적표 PDF/PNG·수능 성적표 PNG — Claude Vision 파싱 → `academic_records` 등 upsert |
| P2-12 | 정시 배치표(구 P3-2 통합) — `admission_records` 기반 |
| P3-4 | 과탐 가산점 시뮬레이터(구 P3-5) |
| P3-6 | 모의지원(사용자 표본) — 가입·동의·표본 규모 충족 후 장기 |
| **생활기록부** | 구조화 입력 UI·9테이블+자격증·학폭 DDL 완료(2026-03-30); RAG `student_record_chunks`·세특 Gap UI 등은 [`docs/08_STUDENT_RECORD_SPEC.md`](./08_STUDENT_RECORD_SPEC.md) 백로그 |

---

## 3) 권장 진행 순서

```text
문서 개정 (§1 표 전체)
    ↓
Week 1: Auth·RLS + DB + admission_db 적재 + RAG ingest
    ↓
Week 2: P0 전체 (P0-2·P0-4 데이터·성능 AC 검증)
    ↓
Week 3: P1 핵심 — P1-15/16 Track 1 우선, 필요 시 2주로 분할
    ↓
Week 4~: 나머지 P1 → P2 전반(P2-9~P2-12 포함) → P3-4·P3-6(장기)
```

---

## 참고 문서

- PRD v2: [`docs/01_PRD_v2.md`](./01_PRD_v2.md)
- 데이터 소스·파이프라인: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) §11
- 아키텍처: [`docs/02_SYSTEM_ARCHITECTURE.md`](./02_SYSTEM_ARCHITECTURE.md)
- API: [`docs/04_API_SPEC.md`](./04_API_SPEC.md)
- 테스트 계획: [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md) · 테스트 스펙: [`docs/07_TEST_SPEC.md`](./07_TEST_SPEC.md) · 사용자 매뉴얼: [`docs/08_USER_MANUAL.md`](./08_USER_MANUAL.md)
- 생활기록부 입력·DB·RAG: [`docs/08_STUDENT_RECORD_SPEC.md`](./08_STUDENT_RECORD_SPEC.md)
