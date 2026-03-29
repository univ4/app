# 모바일 UI 점검·안정화 (PRD §7.3)

**기준:** `docs/01_PRD_v2.md` §7.3 (최소 360px, 주요 화면 3탭 이내, WCAG AA 텍스트 대비).

## 적용 요약

### 네비게이션

- `src/app/dashboard/layout.tsx`: 대시보드 하위 전역 레이아웃, 모바일 하단 여백(`pb-20`).
- `src/components/dashboard/DashboardMobileNav.tsx`: **md 미만** 고정 하단 바 — 홈·신호등·캘린더 1탭, **더보기** 시트로 성적·생기부·분석·챗봇.
- 서브페이지의「대시보드」버튼은 **md 이상**만 표시(모바일은 하단 홈과 중복 제거).

### 반응형·테이블

- 신호등 `SignalTable`: 가로 스크롤 래퍼 + `min-w-[640px]` 테이블.
- 성적 목록: 가로 스크롤 + `min-w-[520px]`.
- 대시보드·신호등·캘린더·생기부·성적: `p-4 sm:p-6`, `min-w-0`·`break-words`로 360px 줄바꿈.

### 터치·폼

- `Button` 기본/`sm`: 모바일 `min-h-11`, `sm:` 이후 기존 높이.
- `Input`: 모바일 `min-h-11`, `sm:` 이후 `h-8`.
- 캘린더: `--cell-size` 모바일 확대, 일정 리스트·월 이동 버튼 터치 확보.
- `EventForm`·성적 폼: `select`/`date` 모바일 높이, 성적 숫자 필드에 `inputMode`(numeric/decimal).
- 생기부: 탭 트리거·네이티브 `select` 모바일 최소 높이.

### 접근성·대비

- `globals.css` `:root`의 `--muted-foreground`를 어둡게 조정(배경 대비 WCAG AA 목표).
- 비활성 탭: `text-muted-foreground`로 통일.
- 루트 `html lang="ko"`.

## 점검 대상 라우트

| 경로 | 비고 |
|------|------|
| `/dashboard` | 그리드 카드, 로그아웃 풀폭(모바일) |
| `/dashboard/signals` | 테이블 가로 스크롤 |
| `/dashboard/calendar` | 캘린더 셀·폼 |
| `/dashboard/student-record` | 탭 래핑·select 높이 |
| `/dashboard/scores` | 폼·목록 테이블 |
| `/login` | 카드 `w-full`, 라벨 대비 |

## 검증

- `npm run build` — 성공.
- `npm test` — 전체 PASS (현재 저장소 기준 **148**건).
