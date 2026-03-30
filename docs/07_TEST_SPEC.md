# Test Spec: Track 1 신규 계산기 (P1-11~16, P2-6 · PRD v2 확장)

**근거 PRD**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) · **로드맵**: [`docs/05_ROADMAP.md`](./05_ROADMAP.md)  
**테스트 계획(06)**: [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md) · **사용자 매뉴얼(08)**: [`docs/08_USER_MANUAL.md`](./08_USER_MANUAL.md)

통합 테스트 전략·기존 케이스는 [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md)를 참조합니다.  
본 문서는 Track 1 함수·`POST /api/chat`에 대한 **단위·라우트 테스트 스펙**을 정의한다(§2·3·8 등은 구현됨, §4·5·6·7 등은 예정).

**실행 스냅샷 (2026-03-30):** `npm test` — 스위트·케이스 수는 로컬 `npm test` 기준. (추가: P2-4 `GET/POST /api/exam-analysis`: `src/__tests__/api/exam-analysis.route.test.ts` — GET 비인증·메타, POST 비인증·JSON 오류·스키마 오류·청크 0건·RPC 경로; P2-11 `POST /api/scores/parse-image`: `src/__tests__/api/scores-parse-image.route.test.ts`, `src/__tests__/lib/neis/mapNeisSubjectJsonToAcademicRow.test.ts`; P2-10 `calcJeongsiGunStrategy` / `POST /api/jeongsi-gun`: `src/__tests__/calculators/calcJeongsiGunStrategy.test.ts`, `src/__tests__/api/jeongsi-gun.route.test.ts`, `src/__tests__/lib/jeongsi-gun/pickJeongsiSignalRow.test.ts`, `src/__tests__/lib/chat/jeongsiGunAnthropic.test.ts`; P2-6 `calcIntegratedStrategy` / `GET /api/integrated-strategy`: `src/__tests__/calculators/calcIntegratedStrategy.test.ts`, `calcIntegratedStrategy.edge.test.ts`, `src/__tests__/api/integrated-strategy.route.test.ts`; P2-5 `calcGradeSimulator` / `GET/POST /api/grade-simulator`: `src/__tests__/calculators/calcGradeSimulator.test.ts`, `src/__tests__/api/grade-simulator.route.test.ts`; P2-9 `calcAdmissionTrend` / `GET /api/trend-analysis`: `src/__tests__/calculators/calcAdmissionTrend.test.ts`, `src/__tests__/api/trend-analysis.route.test.ts`; P1-9 `POST /api/mock-interview/questions`, `POST /api/mock-interview/feedback`, `GET/POST /api/mock-interview`: `src/__tests__/api/mock-interview-questions.route.test.ts`, `mock-interview-feedback.route.test.ts`, `mock-interview.route.test.ts`, `src/__tests__/lib/chat/mockInterview.test.ts`; P1-8 `POST /api/research-topics`: `src/__tests__/api/research-topics.route.test.ts`, `src/__tests__/lib/chat/researchTopics.test.ts`; P1-6 `GET/POST /api/personal-statement`, `PUT /api/personal-statement/[id]`, `POST /api/personal-statement/feedback`: `src/__tests__/api/personal-statement.route.test.ts`, `personal-statement-id.route.test.ts`, `personal-statement-feedback.route.test.ts`, `src/__tests__/lib/chat/personalStatementFeedback.test.ts`; P1-5 `POST /api/student-record/analyze`: `src/__tests__/api/student-record-analyze.route.test.ts`, `src/__tests__/lib/chat/hakjongAnalyze.test.ts`; P1-10 `calcGachaejeomScore` / `POST /api/gachaejeom`: `src/__tests__/calculators/calcGachaejeomScore.test.ts`, `src/__tests__/api/gachaejeom.route.test.ts`; P1-3 `calcRealCompetitionRate` / `GET /api/nulsul`: `src/__tests__/calculators/calcRealCompetitionRate.test.ts`, `src/__tests__/api/nulsul.route.test.ts`; `GET/POST /api/simulator`: `src/__tests__/api/simulator.route.test.ts`; `calcSubjectAdvantage` / `GET /api/subject-analysis`: `src/__tests__/calculators/calcSubjectAdvantage.test.ts`, `src/__tests__/api/subject-analysis.route.test.ts`; `calcPortfolioRisk` / `calcNapchiRisk`: `src/__tests__/calculators/calcPortfolioRisk.test.ts`, `calcNapchiRisk.test.ts`; `GET /api/signals`: `src/__tests__/api/signals.route.test.ts`; 생기부 `[id]`·출결 PUT: `src/__tests__/api/student-record-api.test.ts`; `calcAdmissionSignal`: `src/__tests__/calculators/calcAdmissionSignal.test.ts`; 캘린더·D-Day: `src/__tests__/calendar/calendarDday.integration.test.ts`; P1-12 `calcAdmissionTodos` / `GET /api/calendar/todos`: `src/__tests__/calculators/calcAdmissionTodos.test.ts`, `src/__tests__/api/calendar-todos.route.test.ts`; P1-2 `calcSchoolLevel` / `GET /api/scores/zscore`: `src/__tests__/calculators/calcSchoolLevel.test.ts`, `src/__tests__/api/scores-zscore.route.test.ts`)

---

## 1. `checkSubjectEligibility(profile, requirement)`

| ID | 시나리오 | 기대 |
|---|---|---|
| SE-01 | `required_math`에 `미적분`만 허용인 대학에 학생이 `확률과통계` 선택 | `eligible === false`, `warnings`에 수학 조건 불충족 메시지 |

구현·보강 파일: `src/__tests__/calculators/checkSubjectEligibility.test.ts`

---

## 1a. `calcPlacementTable(params)` (P2-12)

구현·테스트: `src/lib/calculators/calcPlacementTable.ts`, `src/__tests__/calculators/calcPlacementTable.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| PT-01 | 정시 행 3건·안정/적정/도전 분류 | `±5` 밴드에 맞게 세 배열에 분배 |
| PT-02 | `applyMedShift` + 행별 `medShiftCoeff` | `calcAdmissionSignal`과 동일 보정 컷 |
| PT-03 | 빈 `admissionRecords` | 세 구간 모두 빈 배열 |
| PT-04 | 동일 `gap` | `univName`·`deptName`로 정렬 |

**API**: `GET /api/placement-table` — `src/__tests__/api/placement-table.route.test.ts` (비인증 401, 인증 200·`meta`)

---

## 1a2. `calcAdmissionTrend(params)` (P2-9)

구현·테스트: `src/lib/calculators/calcAdmissionTrend.ts`, `src/__tests__/calculators/calcAdmissionTrend.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CAT-01 | 최근 2개년 컷, 변화율 > 2% | `trend === "up"` |
| CAT-02 | 변화율 < -2% | `trend === "down"` |
| CAT-03 | 변화율 ±2% 구간 | `trend === "stable"` |
| CAT-04 | 연도별 행 0~1건 또는 직전 컷 0 | 비교 불가 문구·`stable` |

**API**: `GET /api/trend-analysis` — `src/__tests__/api/trend-analysis.route.test.ts` (비인증 401, 인증 200·`records`·`trend`)

---

## 1a2b. `calcJeongsiGunStrategy(params)` (P2-10)

구현·테스트: `src/lib/calculators/calcJeongsiGunStrategy.ts`, `src/__tests__/calculators/calcJeongsiGunStrategy.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CJG-01 | 세 카드 모두 `challenge` | `riskLevel === "danger"`, 안전망 경고 |
| CJG-02 | `safe` 1개 이상 | `riskLevel === "safe"` |
| CJG-03 | 선택은 있으나 `safe` 없음 | `안전망 없음 경고 ⚠️`, `moderate` |
| CJG-04 | 전부 `null` | `moderate`, 경고 없음, 안내 `recommendation` |
| CJG-05 | 동일 대학명 2슬롯 | `동일 대학 중복 지원 확인` |

**API**: `POST /api/jeongsi-gun` — `src/__tests__/api/jeongsi-gun.route.test.ts` (비인증 401, 인증 200·`strategy`·`ragSummary`)

---

## 1a3. `calcGradeSimulator(params)` (P2-5)

구현·테스트: `src/lib/calculators/calcGradeSimulator.ts`, `src/__tests__/calculators/calcGradeSimulator.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CGS-01 | 단일 과목 등급 향상 | 가중 평균이 목표에 맞게 변함 |
| CGS-02 | 고단위 vs 저단위 동일 등급 향상 | 고단위 과목의 `gradeImpact`가 더 큼 |
| CGS-03 | 목표=현재 | `gradeChange` 0 |
| CGS-04 | 컷오프 + 평균 전후 신호등 구간 이동 | `signalChange` 반영 |
| CGS-05 | 빈 `currentSubjects` | `ValidationError` |

**API**: `GET/POST /api/grade-simulator` — `src/__tests__/api/grade-simulator.route.test.ts` (비인증 401, GET 200·`records`·`universities`, POST 200·`result`, 스키마 오류 422)

---

## 1b. `calcSubjectAdvantage(params)` (P1-11)

구현·테스트: `src/lib/calculators/calcSubjectAdvantage.ts`, `src/__tests__/calculators/calcSubjectAdvantage.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CSA-01 | 확통 + 목표 3교 수학 비율 상이 | 낮은 비율 대학이 `advantageUnivs`, 높은 비율이 `disadvantageUnivs` |
| CSA-02 | 미적분 + 동일 규칙 집합 | 높은 비율 대학이 유리, 낮은 비율이 불리 |
| CSA-03 | 탐구 2과목 + 일부 대학만 `science_2_bonus`>0 | 해당 대학이 유리 목록에 포함 |
| CSA-04 | `ineligibleUniversityNames`에 포함된 목표 교 | 유불리 세 집합 어디에도 나오지 않음 |
| CSA-05 | `scoringRules`가 목표와 맞지 않음 | 빈 목록 + 안내 `summary` |

**API**: `GET /api/subject-analysis` — `src/__tests__/api/subject-analysis.route.test.ts` (비인증 401, 무프로필 200)

---

## 1b-2. `calcScienceComboSimulator` (P3-4)

구현·테스트: `src/lib/calculators/calcScienceComboSimulator.ts`, `src/__tests__/calculators/calcScienceComboSimulator.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| SCS-01 | 과탐Ⅱ 2과목 + 일부 대학만 `science_2_bonus`>0 | 해당 대학이 `advantageUnivs`, `isSci2Combo` true |
| SCS-02 | 과탐Ⅰ 2과목 | `advantageUnivs` 빈 배열, `recommendation`에 과탐Ⅰ 2과목 문구 |
| SCS-03 | 과탐Ⅰ+Ⅱ 혼합(탐구2가 과탐Ⅱ) | `advantageUnivs`에 가산 대학 포함, `recommendation`에 절충 문구 |
| SCS-04 | `scoringRules` 빈 배열 | `advantageUnivs`·`disadvantageUnivs` 빈 배열, 안내 `recommendation` |

**API**: `POST /api/science-combo` — `src/__tests__/api/science-combo.route.test.ts` (비인증 401, 인증 200·`result`)

---

## 1c. `calcIntegratedStrategy` (P2-6)

구현·테스트: `src/lib/calculators/calcIntegratedStrategy.ts`, `src/__tests__/calculators/calcIntegratedStrategy.test.ts`, `src/__tests__/calculators/calcIntegratedStrategy.edge.test.ts` (`calcNapchiRisk` 스텁·기회비용 대체 문구)

| ID | 시나리오 | 기대 |
|---|---|---|
| CIS-01 | 수시 `safe` + 정시 타 대학 안정·적정 신호 | 해당 카드 `riskLevel` `high`, 기회비용 문구에 타 대학 언급 |
| CIS-02 | 수시 `challenge` | `riskLevel` `low`, 포트폴리오는 `aggressive` 쪽 |
| CIS-03 | 정시 `safe` 신호 대학 목록 | `allFailScenario.jeongsiSafeUnivs`에 중복 없이 집계 |
| CIS-04 | 빈 `susiCards` | `napchiRisks` 빈 배열, `overallRisk` `balanced` |
| CIS-05 | `suneungScore` 제공 | `summary`에 점수 반영 |

**API**: `GET /api/integrated-strategy` — `src/__tests__/api/integrated-strategy.route.test.ts` (비인증 401, 인증 200·`napchiRisks`·`allFailScenario`·`overallRisk`·`summary`)

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

## 3b. `calcAdmissionTodos(...)` (P1-12)

구현·테스트: `src/lib/calculators/calcAdmissionTodos.ts`, `src/__tests__/calculators/calcAdmissionTodos.test.ts`

`calcAdmissionTodos({ targetDate, eventType, dday })` — `targetDate`는 `YYYY-MM-DD` 검증용, 필터는 `dday`와 유형별 마일스톤 오프셋으로 결정한다. `aggregateAdmissionTodosFromCalendarEvents`는 캘린더 행 배열을 날짜 순으로 펼친다.

| ID | 시나리오 | 기대 |
|---|---|---|
| AT-01 | `원서접수`, `dday` > 30 | D-30~D-1 전 항목(5개) |
| AT-02 | `원서접수`, `dday` = 7 | D-7, D-3, D-1만 |
| AT-03 | `수능`, `dday` = 1 | D-1 한 항목 |
| AT-04 | 임의 유형, `dday` < 0 | 빈 배열 |

**API**: `GET /api/calendar/todos` — `src/__tests__/api/calendar-todos.route.test.ts` (비인증 401, 인증 200·`data.todos` 배열)

---

## 3c. `calcSchoolLevel(...)` / `zScoreBandLabel` (P1-2)

구현·테스트: `src/lib/calculators/calcSchoolLevel.ts`, `src/__tests__/calculators/calcSchoolLevel.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| CSL-01 | 단일 과목, Z &gt; 0 | `subjectZScores` 1건, `avgZScore`·`levelLabel`이 `calculateZScore` 결과와 정합 |
| CSL-02 | 단일 과목, Z &lt; 0 | `levelLabel`이 하위권 구간 |
| CSL-03 | 동일 배열에 `stdDev === 0` 과목 + 유효 과목 | 0 표준편차 과목은 제외, 평균 Z는 유효 과목만으로 |
| CSL-04 | `subjects: []` | `avgZScore === 0`, `levelLabel === "판별 불가"`, 빈 `subjectZScores` |
| CSL-05 | `zScoreBandLabel` 경계 | Z=1.5 → 중위권, Z=1.51 → 상위권, Z=-0.01 → 하위권 |

**API**: `GET /api/scores/zscore` — `src/__tests__/api/scores-zscore.route.test.ts` (비인증 401, 인증 200·빈 목록·필드 누락·DB 오류 500·`data` null·라벨 기본값)

---

## 3d. `calcRealCompetitionRate(...)` (P1-3)

구현·테스트: `src/lib/calculators/calcRealCompetitionRate.ts`, `src/__tests__/calculators/calcRealCompetitionRate.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| RCR-01 | 명목 10, 충족률 0.5, 결시 0.1 | `realRate === 4.5`, `diffRate === 5.5` |
| RCR-02 | 충족률 1.0, 결시 0.1 | 실질 = 명목 × 0.9 |
| RCR-03 | 결시율 0 | 실질 = 명목 × 충족률 |
| RCR-04 | 명목 0 | 실질·차이 0 |
| RCR-05 | `absenceRate` 생략 | 결시율 0.1로 간주 |
| RCR-06 | 음수 명목·충족률/결시율 범위 밖·NaN | `ValidationError` throw |

**API**: `GET /api/nulsul` — `src/__tests__/api/nulsul.route.test.ts` (비인증 401, 인증 200·`data.items`·`meta`)

---

## 3e. `calcGachaejeomScore(...)` / `POST /api/gachaejeom` (P1-10)

구현·테스트: `src/lib/calculators/calcGachaejeomScore.ts`, `src/__tests__/calculators/calcGachaejeomScore.test.ts`, `src/app/api/gachaejeom/route.ts`, `src/__tests__/api/gachaejeom.route.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| GC-01 | 분포 중심 원점수(국·수·탐 평균) | 추정 표준점수 약 100, 백분위 약 50 |
| GC-02 | 만점 원점수 | 국·수는 표준점수 180 클램프; 탐구는 z=2.5 수준으로 150 근처 |
| GC-03 | 최저 원점수 | 탐구는 표준점수 하한 20 클램프; 국·수 0점은 분포상 20 초과 가능 |
| GC-04 | 정상 완료 | `warning`에 가채점 안내 문구 포함 |
| GC-05 | 빈 과목명·영어 등급 범위 밖 | `ValidationError` |

**API**: `POST /api/gachaejeom` — 비인증 401; 인증·모킹 DB 시 `estimatedScores`·`univResults`·`warning` 반환 (`src/__tests__/api/gachaejeom.route.test.ts`).

---

## 4. `calcRecordGapAnalysis` / `detectGibupGap(...)`

구현·테스트: `src/lib/calculators/calcRecordGapAnalysis.ts`, `src/__tests__/calculators/calcRecordGapAnalysis.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| GG-01 | 세특이 3과목 미입력(빈 문자열 또는 null) | 경고 항목 **3개** 반환, `category`별 구분 |
| RGA-01 | 세특·창체·수상·행동 모두 권장 글자수 이상 | `criticalCount === 0`, 항목 `good` 위주 |
| RGA-02 | 세특 빈 문자열 | 해당 세특 `critical` |
| RGA-03 | 세특 200자 미만 | 해당 세특 `warning` |
| RGA-04 | 창체 활동 데이터 없음 | 창체 3영역 `critical` |
| RGA-05 | 수상 0건 | `수상경력` `critical` |

**API**: `GET /api/record-check` — `src/__tests__/api/record-check.route.test.ts` (비인증 401, 성공 시 `items`·`overallScore`·`criticalCount`·`targetUnivType`).

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

## 6a. `calcPortfolioRisk` / `calcNapchiRisk` (P1-7)

구현·테스트: `src/lib/calculators/calcPortfolioRisk.ts`, `calcNapchiRisk.ts`, `src/__tests__/calculators/calcPortfolioRisk.test.ts`, `calcNapchiRisk.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| PR-01 | 안정·적정·도전이 고르게 6장 이내 | `riskLevel === balanced`, §9.1 경고 없음 |
| PR-02 | 안정 0장 | `"안정 지원이 없습니다…"` 경고, `aggressive` |
| PR-03 | 도전 4장 이상 | `"도전 지원이 너무 많습니다"` |
| PR-04 | 7장 이상 | `"6장을 초과했습니다"` |
| PR-05 | 수능최저 전형 3장 이상 | `"수능최저 리스크를 확인하세요"` |
| NR-01 | `challenge` 카드 | `calcNapchiRisk` → `low` |
| NR-02 | `moderate` 카드 | `medium` |
| NR-03 | `safe` + 정시 신호에 다른 대학 `safe`/`moderate` | `high` (납치 기회비용 휴리스틱) |

---

## 6b. `GET` / `POST /api/simulator`

구현·테스트: `src/app/api/simulator/route.ts`, `src/__tests__/api/simulator.route.test.ts` (`NextRequest` 사용)

| ID | 시나리오 | 기대 |
|---|---|---|
| SIM-GET-01 | 미인증 | `401` `UNAUTHORIZED` |
| SIM-GET-02 | 인증 | `data.portfolio` 객체 또는 `null` |
| SIM-POST-01 | 미인증 | `401` |
| SIM-POST-02 | 유효 `cards`(≤6) | `200`, 저장된 `portfolio` |
| SIM-POST-03 | 잘못된 본문 | `422` `VALIDATION_ERROR` |

---

## 6b. `GET /api/explore` (P1-15 / P1-16)

구현·테스트: `src/app/api/explore/route.ts`, `src/__tests__/api/explore.route.ts`, `src/__tests__/lib/explore/susiRuleHelpers.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| EXP-01 | 미인증 | `401` `UNAUTHORIZED` |
| EXP-02 | 인증·필터 없음 | `200`, `data.items` 배열, `meta.total`·`meta.duration_ms` |
| EXP-03 | `admissionType` 단일/복수 | 해당 전형만 |
| EXP-04 | `signal` 복수·단일 | 해당 신호등만 |
| EXP-PERF | 응답 시간 | 테스트에서 `duration_ms < 3000` (모킹 환경 기준) |

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

## 9b. `POST /api/student-record/analyze` (P1-5)

구현·테스트: `src/app/api/student-record/analyze/route.ts`, `src/lib/chat/hakjongAnalyze.ts`, `src/__tests__/api/student-record-analyze.route.test.ts`, `src/__tests__/lib/chat/hakjongAnalyze.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| HAKJONG-01 | 미인증 요청 | HTTP **401**, `UNAUTHORIZED` |
| HAKJONG-02 | 인증·청크 1건 이상·Anthropic 스트림 모킹 | HTTP **200**, SSE에 `event: chunk` 및 `event: done` 포함 |

---

## 9c. `POST /api/student-record/gap-analysis` (P1-4)

구현·테스트: `src/app/api/student-record/gap-analysis/route.ts`, `src/lib/chat/gapAnalysis.ts`, `src/__tests__/api/gap-analysis.route.test.ts`, `src/__tests__/lib/chat/gapAnalysis.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| GAP-01 | 미인증 요청 | HTTP **401**, `UNAUTHORIZED` |
| GAP-02 | `targetUniv` 누락 | HTTP **422**, `VALIDATION_ERROR` |

---

## 9d. `GET/POST /api/personal-statement`, `PUT /api/personal-statement/[id]`, `POST /api/personal-statement/feedback` (P1-6)

구현·테스트: `src/app/api/personal-statement/route.ts`, `src/app/api/personal-statement/[id]/route.ts`, `src/app/api/personal-statement/feedback/route.ts`, `src/lib/chat/personalStatementFeedback.ts`, `src/__tests__/api/personal-statement.route.test.ts`, `src/__tests__/api/personal-statement-id.route.test.ts`, `src/__tests__/api/personal-statement-feedback.route.test.ts`, `src/__tests__/lib/chat/personalStatementFeedback.test.ts`

| ID | 시나리오 | 기대 |
|---|---|---|
| PS-01 | `GET` 미인증 | HTTP **401**, `UNAUTHORIZED` |
| PS-02 | `GET` 인증·목록 조회 | HTTP **200**, `data.items` 배열 |
| PS-03 | `POST` 미인증 | HTTP **401** |
| PS-04 | `POST` 유효 본문 저장 | HTTP **201**, `data.item` |
| PS-05 | `PUT` 인증·본인 행 수정 | HTTP **200**, `data.item` |
| PS-FEED-01 | `POST /feedback` 미인증 | HTTP **401** |
| PS-FEED-02 | `statementId` 누락 | HTTP **422**, `VALIDATION_ERROR` |

---

## 10. 구현 순서 권장

1. `checkSubjectEligibility` / `analyzeSubjectAdvantage` (이미 존재 시 SE-01만 보강)
2. `calcDDay` (P1-12)
3. `calcSuneungMinimumProbability` (P1-13)
4. `detectGibupGap` (P1-14)
5. `calcSuneungNapchiRisk` (P2-6)
6. `calcAdmissionSignal` (P0-4·P1-17) — §6
7. `scanAdmissionSignals` / `filterUniversitiesByAdmissionCriteria` (가칭, P0-4·P1-15·P1-16) — §7~8 구현 후 테스트 추가
