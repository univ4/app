# Test Spec: Track 1 신규 계산기 (P1-11~14, P2-6)

통합 테스트 전략·기존 케이스는 [`docs/06_TEST_PLAN.md`](./06_TEST_PLAN.md)를 참조합니다.  
본 문서는 **구현 예정** Track 1 함수에 대한 **단위 테스트 스펙(요구사항)**만 정의합니다.

---

## 1. `checkSubjectEligibility(profile, requirement)`

| ID | 시나리오 | 기대 |
|---|---|---|
| SE-01 | `required_math`에 `미적분`만 허용인 대학에 학생이 `확률과통계` 선택 | `eligible === false`, `warnings`에 수학 조건 불충족 메시지 |

구현·보강 파일: `src/__tests__/calculators/checkSubjectEligibility.test.ts`

---

## 2. `calcSuneungMinimumProbability(...)`

| ID | 시나리오 | 기대 |
|---|---|---|
| SMP-01 | 수능최저 조건 `3개합6`, 현재 모의고사 등급이 국1·수2·탐구2(합 5) 등 충족 분포 | 확률 값 0~100 범위, 조건 파싱은 기존 `checkSuneungMinimum`과 일관 |
| SMP-02 | 동일 조건에서 현재 성적이 **1-2-2**(합 5)로 충족하는 케이스 | 충족 확률이 명시적으로 높게 산출(시드 고정 시 스냅샷 검증) |

비고: 과목별 모의고사 평균·표준편차로 등급 분포를 정규분포 근사할 때 입력 검증 실패 시 `ValidationError`.

---

## 3. `calcDDay(...)`

| ID | 시나리오 | 기대 |
|---|---|---|
| DD-01 | 이벤트일 `2026-09-07`, 기준일(오늘) `2026-03-27` | D-Day = `2026-09-07` − `2026-03-27` 일수 = **164** (음수면 이미 지남) |

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

## 6. 구현 순서 권장

1. `checkSubjectEligibility` / `analyzeSubjectAdvantage` (이미 존재 시 SE-01만 보강)
2. `calcDDay` (P1-12)
3. `calcSuneungMinimumProbability` (P1-13)
4. `detectGibupGap` (P1-14)
5. `calcSuneungNapchiRisk` (P2-6)
