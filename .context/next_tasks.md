# Next Tasks

## Week 4 — 완료 (2026-03-30)

다음은 달성됨(상세는 `.context/current_state.md`, `docs/05_ROADMAP.md` Week 4 스냅샷).

1. `/login` `useSearchParams` Suspense 빌드 오류 수정
2. `load_neis_grades.ts` + `20260329170000_academic_records_fix_unique.sql` — `academic_records_upsert_key`; 내신 **49**건 적재 검증
3. 챗봇 E2E — 유사도 임계 **0.55**, 시스템 프롬프트, Bearer 인증, `match_guideline_chunks` 정리
4. P0-4 — `calcAdmissionSignal`, `GET /api/signals`, `/dashboard/signals`, SignalLight/SignalTable
5. P0-5 — `calendar_events`, 기본 4건 RPC, D-Day, `/api/calendar`, `/dashboard/calendar`
6. 생활기록부 입력 폼 — 9탭, `student_certificates`·`student_school_violence` 마이그레이션
7. 모바일 UI — 360px, 하단 네비, 터치·WCAG AA, [`docs/08_MOBILE_UI.md`](../docs/08_MOBILE_UI.md)

---

## P1 우선순위 (Week 5 이후 권장 순서)

로드맵·PRD v2 기준, 코어 MVP(P0) 이후 밀도 높은 항목.

| 순위 | ID | 내용 |
|---:|---|---|
| 1 | **P1-1** | 챗봇 **전용 UI/UX** (스트리밍·출처·모바일 입력 경험); 백엔드 RAG는 검증 완료 |
| 2 | **P1-7** | 6장 원서 배분 전략 시뮬레이터 |
| 3 | **P1-11** | 선택과목 분석기 UI — `checkSubjectEligibility`·`subject_profiles`·`GET /api/subject-profile/.../eligibility`와 정합 |
| 4 | **P1-15** | 전국 199개 탐색기 — `GET /api/signals`·입결 스캔 패턴 확장 |
| 5 | **P1-16** | 조건부 필터링 — `filterUniversitiesByAdmissionCriteria`(가칭) Track 1 + API |
| 6 | **P1-12** | D-Day **역산 TO-DO** — `GET /api/dday/todos` 실구현·캘린더 연동 |
| 7 | **P1-2** | Z점수 UI·노출 강화 (`calculateZScore` 이미 존재) |
| 8 | **P1-4 / P1-14** | 세특 Gap · `detectGibupGap` + UI |
| 9 | **P1-17** | 신호등 대표 확률 **표시·카피·튜닝** (Track 1 구간값은 반영됨) |

그 외 P1-3, P1-5~P1-10, P1-6, P1-8, P1-9는 `docs/05_ROADMAP.md` §Week 4 이후 표와 PRD 순서를 따름.

---

## 백로그 (데이터·파이프라인)

- **생활기록부 RAG** — `student_record_chunks` 임베딩·챗봇 컨텍스트
- **`scripts/ingest/parse_neis_grades.ts`** — P2-11 Claude Vision 연계
- **내신 수동 입력** — 운영 데이터 지속 입력

---

## 참고 (Week 3 산출)

- W3-A1: `20260329000002_admission_records`
- W3-A2: `load_admission_db.ts` (3,393건)
- W3-A3: `embed_and_store.ts` (6,256청크)
- W3-B1: `calcDDay()` + `schedules.ts`
- W3-B2: `calcSuneungMinimumProbability()` + `api/analysis/minimum-check`
- W3-B3: `POST /api/chat` + `20260329120000_chat_rag`
- CI: `data-update.yml`, `githubReleaseFetch.ts`
