# Architecture & Technical Decisions

## Chosen Decisions

1. **`middleware.ts` -> `proxy.ts`**
   - Reason: Next.js 16 deprecates middleware convention for this use case.
   - Impact: Auth/session and route guards are centralized in `src/proxy.ts`.

2. **Supabase SSR split (`server.ts` / `client.ts`)**
   - Reason: Clear separation between server-side cookie-aware access and browser client usage.
   - Impact: API routes/server components use server client; client components use browser client.

3. **Two-track architecture (Track1 calculators vs Track2 RAG)**
   - Reason: Deterministic math must be reproducible and auditable; LLM is for reasoning/explanation.
   - Impact: Numeric decisions run in `src/lib/calculators/*` pure functions.

4. **Server Component-first strategy**
   - Reason: Better security/data locality in App Router and simpler auth-aware rendering.
   - Impact: Client components are used only for interactivity (forms/sliders/charts).

5. **Shadcn UI + Tailwind with Nova-style component set**
   - Reason: Fast iteration, consistent design primitives, and easy composability.
   - Impact: Reused Card/Table/Badge/Tabs/Input/Button patterns across screens.

6. **Seed-first domain bootstrap**
   - Reason: Admission logic requires baseline university/rule/schedule data for meaningful UI.
   - Impact: `supabase/seed.sql` is extensive and includes TODO-labeled provisional values.

## Testing & Quality (Week 2 정리)

7. **테스트 디렉터리 구조**
   - Track 1 계산기: `src/__tests__/calculators/`
   - API 라우트: `src/__tests__/api/` (`*.route.test.ts` 등)
   - Impact: Husky/CI는 계산기↔파일 매칭 규칙과 병행해 API 테스트는 별도 경로로 확장.

8. **커버리지 목표**
   - 브랜치 **≥ 85%**, 구문 **≥ 90%** (Jest `collectCoverageFrom` 범위 내에서 점진적 달성).
   - 현재(Week 3 직전): 구문 ~96.8%, 브랜치 ~83.3% — 브랜치 목표는 Week 3에서 추가 분기 테스트로 맞춤.

9. **HTTP 검증 실패 상태 코드**
   - 클라이언트 입력 검증 실패는 **400 대신 422** (`VALIDATION_ERROR`) 사용.
   - Impact: `scores`, `analysis/probability` 등 Zod 경계와 문서·테스트가 422 기준으로 통일.

10. **Lint 실행 방식**
    - `next lint` 대신 **`eslint .`** 사용 (Next.js 16.2 환경에서 디렉터리/설정 이슈 회피).
    - Impact: 로컬·CI에서 동일한 ESLint 진입점 유지.

11. **`jest.config.ts` — `collectCoverageFrom`**
    - `src/lib/calculators/**/*.ts` + `src/app/api/**/route.ts` (테스트·d.ts 제외).
    - Impact: Track 1 + 핵심 API 라우트 커버리지가 한 리포트에 포함.

## Rejected / Deferred Alternatives

1. **LLM direct score calculations**
   - Rejected because deterministic admission scoring must not depend on model variance.

2. **Client-only auth gating**
   - Rejected due to security and flicker risk; route protection is enforced at proxy/server level.

3. **Single monolithic analysis endpoint**
   - Deferred in favor of focused endpoints (`probability`, `minimum-check`) for easier testing and iteration.

4. **Hard-fail when `cutline_70` seed missing**
   - Deferred for now; fallback behavior is used to keep pages functional in incomplete local datasets.
