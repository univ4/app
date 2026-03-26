# Development Roadmap (PRD 기능 번호 기준)

원본 요구·우선순위는 [`docs/01_PRD.md`](./01_PRD.md)를 따릅니다.

## 기능 수 요약

| 우선순위 | 개수 | 비고 |
|---|---:|---|
| P0 | 5 | MVP 코어 |
| P1 | 14 | 즉시·단기 구현 |
| P2 | 8 | 다음 스프린트 |
| P3 | 4 | 중장기 |
| **합계** | **31** | P0+P1+P2+P3 |

---

## Week 3 스프린트 (우선 보강)

기존 계획(인증, 성적, 정시/교과 엔진, 신호등, 캘린더)에 더해 아래를 **우선** 포함합니다.

- **P1-12** 입시 D-Day 캘린더 — Track1 `calcDDay()` + UI
- **P1-13** 수능최저 충족 확률 — Track1 `calcSuneungMinimumProbability()` (모의고사 분포 기반)
- **P1-11** 선택과목 분석기 — DB 마이그레이션(`subject_profiles`, `univ_subject_requirements`, `universities`, `departments`) 및 `checkSubjectEligibility` 연동

---

## Week 4 스프린트

- **P1-11** 선택과목 분석기 UI(프로필 저장·지원 가능 필터·경고 리스트·Track2 요약 연동)
- **P1-14** 생기부 공백 탐지기 — Track1 `detectGibupGap()` + 신호등 UI

---

## Week 5 이후 스프린트

- **P2-6** 수시·정시 통합 전략 뷰 (`calcSuneungNapchiRisk` 등)
- **P2-7** 합격자 스펙 비교 분석기 (공시 데이터 RAG)
- **P2-8** N수생 비율 및 경쟁 강도 분석기 (입학처 공시 RAG)

---

## 참고 문서

- 아키텍처 보강: [`docs/02_SYSTEM_ARCHITECTURE.md`](./02_SYSTEM_ARCHITECTURE.md)
- API: [`docs/04_API_SPEC.md`](./04_API_SPEC.md)
- 테스트 스펙: [`docs/06_TEST_SPEC.md`](./06_TEST_SPEC.md)
