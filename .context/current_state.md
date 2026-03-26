# Current State (Week 3 직전)

## Phase: Week 1–2 완료

- **Week 1–2**: 기반 설계 + Track 1 계산 엔진 + 테스트 인프라까지 완료.
- 인증·대시보드·성적 입력·분석(확률·수능최저) UI/API·시드·멀티 학생 마이그레이션 등이 동작 가능한 수준으로 정리됨.

## 완료된 핵심 산출물

### Calculators (7개, `src/lib/calculators/`)

- `analyzeSubjectAdvantage.ts`
- `calculateAdmissionProbability.ts`
- `calculateSuneungScore.ts`
- `calculateSusiGPA.ts`
- `calculateZScore.ts`
- `checkSubjectEligibility.ts`
- `checkSuneungMinimum.ts`

### API routes (3개, `src/app/api/**/route.ts`)

- `api/scores/route.ts`
- `api/analysis/probability/route.ts`
- `api/analysis/minimum-check/route.ts`

### 테스트 (10 suites, `src/__tests__/`)

- `calculators/*.test.ts` × 7
- `api/*.route.test.ts` × 3

## 테스트·품질 현황

- **Jest**: `jest.config.ts` (next/jest), `testMatch`: `src/__tests__/**/*.test.ts`
- **결과**: **82 tests PASS** / 10 suites / FAIL 0
- **커버리지** (`collectCoverageFrom`: calculators + 위 3개 api route 기준, `npm run test:coverage`):
  - **구문(Statements)**: **96.84%**
  - **브랜치(Branch)**: **83.33%**

## 도구·규칙·CI

- **Husky**: pre-commit 설치 완료 (PRD↔ROADMAP, migration↔DATA_MODEL, calculator↔test, `npm test` 등)
- **GitHub Actions**: `.github/workflows/ci.yml` 생성 완료
- **Cursor rules**: `.cursor/rules/` **6개** `.mdc` (`00`~`04` + `05_change_protocol.mdc`)

## 알려진 미완·주의

- **`probability/route.ts`**: 브랜치 커버리지 **73.91%** — 특히 `getCutline70` 내부 **61행**(`if (error) throw error`) 등 Supabase 에러 경로가 테스트로 덜 닫혀 있음.
- `supabase/seed.sql` 등 도메인 데이터는 요강 대조·검증 TODO가 남아 있음.
- `cutline_70` 시드 부족 시 확률 API는 폴백(`cutline_70 = converted_score`) 동작.

## Git 스냅샷 (참고)

- 브랜치/커밋은 로컬 작업에 따라 변동 — Week 3 시작 전 `git status`로 확인 권장.
