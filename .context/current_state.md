# Current State (2026-03-30)

## 기능 완료 현황

- **P0:** 5/5 완료
- **P1:** 17/17 완료
- **P2:** 7/10 완료 (`P2-3`, `P2-7`, `P2-8`은 외부 데이터 필요)
- **P3:** 3/5 완료 (`P3-6`은 서비스 오픈 후 진행)

## 최근 완료 작업

- UI/UX 전면 개편 (블루 포인트 + 6카드 + 사이드바)
- 도움말 페이지 추가: `/dashboard/help`
- 파비콘/탭 제목 변경
- 신호등 대학 필터 18개 전체 반영
- `university_scoring_rules` 18개 대학 적재
- Supabase 조회 제한 대응: `limit 1000` -> `range` 페이징
- QA/E2E 테스트 완료 (Jest + Playwright)
- CI 자동화 강화 (Jest + E2E + 실DB 통합)
- `data-collector` RunBook 보강

## 테스트 현황

- **Jest:** 441개 PASS
- **Playwright E2E:** 14/14 PASS
- **실DB 통합 테스트:** 4/4 PASS
- **커버리지:** 82.90%

## 문서/룰 동기화 메모

- `.cursor/rules/02_architecture.mdc`에 도움말/공통 컴포넌트, 대시보드 신규 컴포넌트, `GET /api/signals` 응답 확장, `get_distinct_univ_names()` RPC 반영.
- `.cursor/rules/05_change_protocol.mdc` 내
  - 도움말 매뉴얼 동기화 규칙
  - `data-testid` 규칙
  - E2E 테스트 안정성 규칙
  모두 존재 확인.

## 다음 작업 (우선순위)

1. 배포 준비 (Vercel)
2. 데이터 보강 (추가 대학 전형계획)
