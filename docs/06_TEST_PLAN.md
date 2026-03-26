# Test Plan: univ

`docs/01_PRD.md`, `docs/02_SYSTEM_DESIGN.md`, `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/03_DB_SCHEMA.md`, `docs/03_DATA_MODEL.md`, `docs/04_API_SPEC.md`, `docs/05_AI_PIPELINE.md`, `docs/05_ROADMAP.md`, `docs/06_TEST_SPEC.md`를 기준으로 작성한 통합 테스트 계획서입니다.

## 1. 테스트 전략 개요

univ 프로젝트는 3단계 테스트 전략으로 운영합니다.

- **Unit Test**
  - 대상: Track 1 계산 함수(`src/lib/calculators/*`)
  - 도구: TypeScript + Jest
  - 목표: 계산 정확도/경계값/에러 처리 보장
- **Integration Test**
  - 대상: API Route + Supabase DB 연동
  - 환경: Supabase 로컬 에뮬레이터(`supabase start`)
  - 목표: 인증/권한/RLS/응답 포맷/DB 반영 검증
- **Manual E2E Test**
  - 대상: 실제 가족 사용 시나리오(아빠/아들/엄마)
  - 목표: 사용자 관점 기능 검증 및 모바일 사용성 확인
  - 비고: Playwright 자동화는 P2 단계에서 도입

---

## 2. Unit Test: Track 1 계산 엔진

### 2-1. `calculateZScore(rawScore, mean, stddev)`

테스트 파일:

```txt
src/__tests__/calculators/calculateZScore.test.ts
```

Happy Path (정상 2개):
- 원점수 92, 평균 68.4, 표준편차 15.2 -> 기대값 `1.55` (소수 2자리 반올림)
- 원점수 55, 평균 55, 표준편차 10 -> 기대값 `0.00`

Edge Case (경계 2개):
- 표준편차 0 -> `ValidationError` throw (ZeroDivisionError 방지)
- 원점수 < 평균 -> 음수 Z점수 정상 반환(예: 40, 60, 10 -> `-2.00`)

Error Case (실패 1개):
- 입력값 누락(undefined 포함) -> `ValidationError` throw

Jest 예시 스켈레톤:

```ts
describe("calculateZScore", () => {
  it("returns 1.55 for (92,68.4,15.2)", () => {});
  it("returns 0.00 for equal score and mean", () => {});
  it("throws ValidationError when stddev is 0", () => {});
  it("returns negative score when raw < mean", () => {});
  it("throws ValidationError when input is undefined", () => {});
});
```

---

### 2-2. `calculateSuneungScore(scores, rules)`

테스트 파일:

```txt
src/__tests__/calculators/calculateSuneungScore.test.ts
```

Happy Path (정상 2개):
- 서강대 자연계열 규칙 적용(국20% + 수35% + 영환산 + 과탐45%) + 과탐II 3% 가산점  
  입력: 국131/수145/영2등급/과탐68+65 -> 예상 환산점수(테스트 내 고정값) 검증
- 영어 1등급(100) vs 2등급(96) 환산표 차이 반영 검증(동일 타 점수 조건)

Edge Case (경계 2개):
- `rules.science_2_bonus = 0` 대학 -> 가산점 없이 계산 정상 완료
- 변환표준점수 테이블 미존재 백분위 -> 보간(interpolation) 적용 또는 정책상 에러 throw
  - 팀 규칙 고정 필요: **권장 기본값 = 선형보간**

Error Case (실패 1개):
- `rules` 객체 누락 -> `ValidationError` throw

Jest 예시 스켈레톤:

```ts
describe("calculateSuneungScore", () => {
  it("calculates score with Sogang natural-science rule and sci2 bonus", () => {});
  it("reflects difference between English grade 1 and 2 conversion", () => {});
  it("works without science2 bonus when bonus is zero", () => {});
  it("interpolates or throws when percentile mapping is missing", () => {});
  it("throws ValidationError when rules are missing", () => {});
});
```

---

### 2-3. `calculateSusiGPA(records, rules)`

테스트 파일:

```txt
src/__tests__/calculators/calculateSusiGPA.test.ts
```

Happy Path (정상 2개):
- 서강대 전 과목 반영, 일반선택 과목 5개 -> 가중 평균 등급 산출 검증
- 진로선택과목 A 포함 -> `career_choice_conversion{"A":10}` 반영 검증

Edge Case (경계 2개):
- 반영 교과 외 과목 포함 -> 해당 과목 제외 후 계산
- 단위수 합계 0 -> 에러 throw

Error Case (실패 1개):
- `records` 빈 배열 -> `ValidationError` throw

Jest 예시 스켈레톤:

```ts
describe("calculateSusiGPA", () => {
  it("calculates weighted GPA with included subjects", () => {});
  it("applies career-choice conversion for achievement A", () => {});
  it("ignores subjects not included by rule", () => {});
  it("throws when total credit unit is zero", () => {});
  it("throws ValidationError when records are empty", () => {});
});
```

---

### 2-4. `calculateAdmissionProbability(score, cutline, discountFactor)`

테스트 파일:

```txt
src/__tests__/calculators/calculateAdmissionProbability.test.ts
```

판정 기준(고정):
- 안정: `score > adjustedCutline + 5`
- 적정: `adjustedCutline - 5 <= score <= adjustedCutline + 5`
- 도전: `score < adjustedCutline - 5`
- `adjustedCutline = cutline + discountFactor` (예: -3.2 적용 시 커트라인 하향)

Happy Path (정상 2개):
- score 924.5, cutline 918.2, discount -3.2 -> adjusted 915.0 -> `적정` 반환
- score 900, cutline 918.2, discount -3.2 -> adjusted 915.0 미달 -> `도전` 반환

Edge Case (경계 2개):
- discountFactor = 0 -> 보정 없이 원본 cutline 기준
- score == cutline (또는 adjustedCutline) -> `적정` 반환

Error Case (실패 1개):
- score/cutline가 숫자가 아님 -> `ValidationError` throw

Jest 예시 스켈레톤:

```ts
describe("calculateAdmissionProbability", () => {
  it("returns 적정 when score is within ±5 range", () => {});
  it("returns 도전 when score is below adjusted cutline-5", () => {});
  it("uses original cutline when discount is zero", () => {});
  it("returns 적정 when score equals cutline boundary", () => {});
  it("throws ValidationError for invalid number input", () => {});
});
```

---

### 2-5. P1-11~14 / P2-6 Track 1 신규 함수

상세 케이스 ID·시나리오는 [`docs/06_TEST_SPEC.md`](./06_TEST_SPEC.md)에 정의합니다.

포함 예정 함수:
- `checkSubjectEligibility`, `analyzeSubjectAdvantage` (기존 구현 + SE-01 보강)
- `calcSuneungMinimumProbability`, `detectGibupGap`, `calcDDay`, `calcSuneungNapchiRisk` (구현 후 동 문서 기준으로 Jest 추가)

---

## 3. Integration Test: API Route

테스트 환경:

```txt
Supabase 로컬 에뮬레이터: supabase start
```

### 3-1. POST `/api/scores`

테스트 케이스:
- 정상: 유효한 `MOCK_EXAM` 데이터 -> `201` + DB row 생성 확인
- 정상: 유효한 `SCHOOL_GPA` 데이터 -> `201` + DB row 생성 확인
- 실패: 인증 토큰 없음 -> `401`
- 실패: `record_type` 누락 -> `422`

검증 포인트:
- 공통 응답 포맷(`data`, `error`) 준수
- Admin만 쓰기 가능(Viewer 토큰 시 `403`)

### 3-2. GET `/api/analysis/probability`

테스트 케이스:
- 정상: 성적 + 대학 규칙 존재 -> `200`, `probability`에 안정/적정/도전 포함
- 실패: 성적 데이터 없음 -> `404`
- 실패: 지원하지 않는 대학명 -> `404`

검증 포인트:
- `admission_type=정시|학생부교과` 분기 정상
- 보정 계수 적용 여부(`discount_applied`) 포함

### 3-3. POST `/api/chat`

테스트 케이스:
- 정상: "서강대 논술 수능최저 알려줘" -> `200`, 관련 청크 기반 답변
- 정상: `stream=true` -> `Content-Type: text/event-stream` 확인
- 실패: `guideline_chunks` 데이터 없음 -> "요강 데이터가 없습니다" 메시지
- 검증: 환각 방지 정책 문구(컨텍스트 외 정보 제한) 적용 여부 확인

검증 포인트:
- 메타데이터 필터(`university_name`, `admission_type`, `admission_year`) 적용
- 계산 질문 시 Tool Use 로그 발생 확인

---

## 4. RAG 품질 테스트 (Manual)

수동 질문 10개에 대해 예상 키워드와 판정 기준을 적용합니다.

| # | 질문 | 예상 키워드 | 판정 기준 |
|---|---|---|---|
| 1 | 서강대 논술전형 수능 최저학력기준은? | 3개합6, 자연계열 | 숫자 정확히 포함 시 Pass |
| 2 | 성균관대 과학인재전형 평가요소는? | 학업역량, 진로역량, 공동체역량, 비율 | 3개 요소 + 비율 포함 시 Pass |
| 3 | 한양대 논술전형 수능최저가 있어? | 2026년 신설, 조건 명시 | 신설 여부 정확히 답변 시 Pass |
| 4 | 서강대 학생부교과전형 반영 과목은? | 전 과목, 반영비율 | 반영 방식 정확히 포함 시 Pass |
| 5 | 성균관대 논술 원서접수 일정은? | 날짜 포함 | 날짜 형식(YYYY.MM.DD) 포함 시 Pass |
| 6 | 한양대 이공계 정시 수학 반영비율은? | 35% 또는 해당 수치 | 수치 정확히 포함 시 Pass |
| 7 | 과탐II 가산점이 있는 대학은? | 서강대, 성균관대 등 | 대학명 정확히 포함 시 Pass |
| 8 | 서강대 면접 있어? | 학종 면접 여부, 전형명 | 전형별 면접 유무 구분 시 Pass |
| 9 | 요강에 없는 내용 질문 (허위 전형명) | "확인할 수 없습니다" 류 답변 | 모른다고 답변 시 Pass, 지어내면 Fail |
| 10 | 수능 환산점수 계산 요청 | Tool Use 호출 후 계산 결과 | 직접 계산 없이 도구 사용 시 Pass |

운영 기준:
- 10개 중 9개 이상 Pass를 목표
- Fail 문항은 원인 분류(검색 실패/프롬프트 문제/데이터 누락) 후 즉시 수정

---

## 5. E2E 시나리오 테스트 (Manual)

### 시나리오 A. 아빠(Admin) 최초 세팅
- [ ] 회원가입 및 로그인
- [ ] 아들 프로필 생성 (목표: 서성한 이공계)
- [ ] 6월 모의고사 성적 입력 (MOCK_EXAM)
- [ ] 내신 과목별 성적 입력 5개 (SCHOOL_GPA, 원점수/평균/표준편차 포함)
- [ ] 성적 대시보드에서 추이 그래프 정상 출력 확인
- [ ] 합격 가능성 신호등 [안정/적정/도전] 정상 출력 확인

### 시나리오 B. 아들(Viewer) 챗봇 사용
- [ ] 아들 계정으로 로그인
- [ ] "서강대 논술 수능최저 알려줘" 질문 -> 정확한 답변 확인
- [ ] "내 성적으로 성균관대 갈 수 있어?" 질문 -> Tool Use 기반 환산점수 포함 답변 확인
- [ ] `stream=true` 환경에서 타이핑 효과 정상 출력 확인

### 시나리오 C. 엄마(Viewer) 캘린더 확인
- [ ] 엄마 계정으로 로그인
- [ ] 입시 캘린더에서 9월 수시 원서접수 일정 확인
- [ ] 모바일(375px) 환경에서 레이아웃 깨짐 없음 확인
- [ ] Admin 전용 기능(성적 입력, 일정 추가) 버튼 비노출 확인

---

## 6. 회귀 테스트 체크리스트

코드 변경 후 필수 재검증 항목:

- [ ] 계산 엔진 Unit Test 전체 통과(Jest)
- [ ] 합격 가능성 신호등 임계값(안정/적정/도전) 변경 없음
- [ ] RAG 품질 테스트 10문항 중 9개 이상 Pass
- [ ] RLS 정책: 타인 계정 데이터 접근 차단 확인
- [ ] 모바일(375px, 768px) 레이아웃 정상

권장 실행 순서:
1. Unit Test
2. Integration Test
3. Manual RAG 품질 테스트
4. Manual E2E 시나리오
5. 회귀 체크리스트 최종 확인

