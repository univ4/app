# Test Spec: Track 1 신규 계산기 (P1-11~16, P2-6 · PRD v2 확장)

**근거 PRD**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) · **로드맵**: [`docs/05_ROADMAP.md`](./05_ROADMAP.md)  
**테스트 계획(06)**: [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md) · **사용자 매뉴얼(08)**: [`docs/08_USER_MANUAL.md`](./08_USER_MANUAL.md)

통합 테스트 전략·기존 케이스는 [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md)를 참조합니다.  
본 문서는 Track 1 함수·`POST /api/chat`에 대한 **단위·라우트 테스트 스펙**을 정의한다(§2·3·8 등은 구현됨, §4·5·6·7 등은 예정).

**실행 스냅샷 (2026-03-30):** `npm test` — **18** suites, **173** tests, FAIL 0. (`GET /api/signals`: `src/__tests__/api/signals.route.test.ts`; 생기부 `[id]`·출결 PUT: `src/__tests__/api/student-record-api.test.ts`; `calcAdmissionSignal`: `src/__tests__/calculators/calcAdmissionSignal.test.ts`; 캘린더·D-Day: `src/__tests__/calendar/calendarDday.integration.test.ts`)

---

## 1. `checkSubjectEligibility(profile, requirement)`

| ID | 시나리오 | 기대 |
|---|---|---|
| SE-01 | `required_math`에 `미적분`만 허용인 대학에 학생이 `확률과통계` 선택 | `eligible === false`, `warnings`에 수학 조건 불충족 메시지 |

구현·보강 파일: `src/__tests__/calculators/checkSubjectEligibility.test.ts`

---

## 2. `calcSuneungMinimumProbability(...)`

구현·테스트: `src/lib/calculators/calcSuneungMinimumProbability.ts`, `src/__tests__/calculators/calcSuneungMinimumProbability.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| SMP-01 | `3개합6` 등가 `requirement` + 국·수·영·탐 등급, `trend`로 분산 축소 | `probability` ∈ [0,1], `riskLevel` 구간(0.78/0.5 경계)과 `checkSuneungMinimum` 규칙 정합 |
| SMP-02 | 동일 조건에서 성적이 충족에 가깝고 분산이 작을 때 | 충족 확률이 불충족 케이스보다 명확히 높음(시드·표본 고정) |
| SMP-03 | `subjectsForSum` + `englishMaxGrade`만 별도(합산 풀에 영어 미포함) | 영어는 샘플에만 포함되고 `N개합` 풀과 분리되어 평가됨 (`/api/analysis/minimum-check` GET과 동일 패턴) |

비고: 입력 검증 실패 시 `ValidationError`. 구간 라벨은 `suneungMinimumRiskLevel` 단위 테스트로 경계 검증.

---

## 3. `calcDDay(...)`

구현·테스트: `src/lib/calculators/calcDDay.ts`, `src/__tests__/calculators/calcDDay.test.ts`

시그니처: `calcDDay(targetDate: string)` — 기준일은 런타임 “오늘”; 단위 테스트에서는 `jest.setSystemTime`으로 오늘을 고정한다.

| ID | 시나리오 | 기대 |
|---|---|---|
| DD-01 | 이벤트일 `2026-09-07`, 오늘을 `2026-03-27`로 고정 | `dday` = **164**, 라벨 `D-164` (음수면 이미 지남 → `D+{n}`) |
| DD-01b | 동일 이벤트, 오늘을 `2026-03-29`로 고정 | `dday` = **162**, 라벨 `D-162` |

---

## 4. `detectGibupGap(...)`

| ID | 시나리오 | 기대 |
|---|---|---|
| GG-01 | 세특이 3과목 미입력(빈 문자열 또는 null) | 경고 항목 **3개** 반환, `category`별 구분 |

---

## 5. `calcSuneungNapchiRisk(...)`

| ID | 시나리오 | 기대 |
|---|---|---|
| NR-01 | 수시 포트폴리오가 **안정 1장**만 있고 나머지 도전 위주 | `risk_level === "HIGH"` (또는 동등한 열거값) |

---

## 6. `calcAdmissionSignal(...)`

구현·테스트: `src/lib/calculators/calcAdmissionSignal.ts`, `src/__tests__/calculators/calcAdmissionSignal.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CAS-01 | 수능, 컷 대비 +5 초과 | `signal === safe`, `probability === 0.85` |
| CAS-02 | 수능, 컷 ±5 밴드 | `moderate`, `0.70` |
| CAS-03 | 수능, 컷−5 미만 | `challenge`, `0.40` |
| CAS-04 | 교과, 컷−0.3 미만(유리) | `safe` |
| CAS-05 | 교과, 컷±0.3 | `moderate` |
| CAS-06 | 교과, 컷+0.3 초과 | `challenge` |
| CAS-07 | `medShiftCoeff` 음수 가산 시 컷 하향 | 동일 점수에서 신호등이 유리 쪽으로 이동 가능 |

---

## 7. `scanAdmissionSignals(...)` *(가칭, P0-4 / P1-15)*

| ID | 시나리오 | 기대 |
|---|---|---|
| SAS-01 | 동일 성적·입결 픽스처에 대해 199개(또는 서브셋) 행에 `안정/적정/도전` 배지가 각 1개씩만 부여 | 결정론적 동일 출력 |
| SAS-02 | `med_shift_2026`(또는 동등 보정 계수) on/off 시 컷라인 비교 결과가 스냅샷으로 구분됨 | PRD P0-4 AC |

성능: 통합/E2E에서 “전체 스캔 3초 이내”는 별도 임계 검증(부하·캐시 정책과 연계).

---

## 8. `filterUniversitiesByAdmissionCriteria(...)` *(가칭, P1-16)*

| ID | 시나리오 | 기대 |
|---|---|---|
| FUC-01 | `수능최저 없음` 단일 조건 | 해당 전형만 통과 |
| FUC-02 | `수능최저 없음` AND `학생부교과` | 교집합만 반환 |
| FUC-03 | 조합 결과 0건 | 빈 배열 + UI 메시지는 API 메타 또는 클라이언트 정책으로 “조건 완화” 안내 가능 |

---

## 9. `POST /api/chat` (Track 2 RAG)

구현·테스트: `src/app/api/chat/route.ts`, `src/lib/chat/ragChat.ts`, `src/__tests__/api/chat.route.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CHAT-01 | 미인증 요청 | HTTP **401**, `UNAUTHORIZED` |
| CHAT-02 | `try_consume_chat_quota`가 `RATE_LIMIT` | HTTP **429** |
| CHAT-03 | `match_guideline_chunks` 결과 0건 | SSE에 **`확인 불가`**, Anthropic `fetch` 미호출 |
| CHAT-04 | 청크 1건 이상 | OpenAI 임베딩 + Anthropic 스트림 → SSE `chunk`/`done`, `done.citations`에 청크 메타 |

---

## 10. 구현 순서 권장

1. `checkSubjectEligibility` / `analyzeSubjectAdvantage` (이미 존재 시 SE-01만 보강)
2. `calcDDay` (P1-12)
3. `calcSuneungMinimumProbability` (P1-13)
4. `detectGibupGap` (P1-14)
5. `calcSuneungNapchiRisk` (P2-6)
6. `calcAdmissionSignal` (P0-4·P1-17) — §6
7. `scanAdmissionSignals` / `filterUniversitiesByAdmissionCriteria` (가칭, P0-4·P1-15·P1-16) — §7~8 구현 후 테스트 추가
