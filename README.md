# univ

> 고3 수험생 아들을 위한 가족 전용 AI 대입 컨설팅 대시보드.  
> Built by a developer dad. Powered by Claude 3.5 Sonnet + OpenAI Embeddings.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## 프로젝트 소개

univ는 고3 수험생 자녀의 성적, 요강, 일정, 지원전략을 한 곳에서 관리하기 위한 가족 전용 웹 서비스입니다.  
대치동 월 100만원대 컨설팅 의존도를 낮추고, 데이터 기반의 반복 가능한 의사결정을 집에서 직접 수행하는 것을 목표로 합니다.  
사용자는 아빠(Admin), 아들(Viewer), 엄마(Viewer)로 구성되며, Supabase RLS 기반으로 가족 데이터만 접근합니다.

## 핵심 기능 요약

### P0 (MVP)
- **성적 관리 대시보드**: 내신/모의고사 성적 입력과 추이 시각화를 제공한다.
- **정밀 환산점수 계산 엔진**: 정시 반영비율, 영어 환산, 과탐II 가산점, 변환표준점수를 결정론적으로 계산한다.
- **학생부교과 내신 산출 엔진**: 대학별 반영 교과와 진로선택 환산 규칙으로 실질 내신 등급을 산출한다.
- **합격 가능성 신호등**: 입결 비교와 2026 의대 증원 보정 계수를 반영해 안정/적정/도전을 표시한다.
- **가족 공용 입시 캘린더**: 원서/고사/마감 일정을 공유하고 알림으로 관리한다.

### P1
- **AI 요강 챗봇(RAG)**: 모집요강 기반 질의응답과 출처 중심 답변을 제공한다.
- **Z점수 기반 고교 수준 판별**: 원점수/평균/표준편차/수강자수로 상대적 위치를 해석한다.
- **논술전형 실질 경쟁률 판독기**: 수능최저 충족률과 결시율을 반영해 실질 경쟁률을 계산한다.

### P2
- **세특 Gap Analysis 및 액션 플랜 생성기**: 학생부종합 관점의 보완 포인트와 실행 주제를 제안한다.
- **생기부 학생부종합 역량 분석**: 학업/진로/공동체 역량을 근거 텍스트 기반으로 분석한다.

## 기술 스택

| 분류 | 기술 | 용도 |
|---|---|---|
| Frontend | Next.js 15 (App Router) | 웹 앱 프레임워크 |
| UI | Tailwind CSS, Shadcn UI | 반응형 UI/컴포넌트 |
| Backend/DB | Supabase (PostgreSQL + pgvector) | 인증, 데이터 저장, 벡터 검색 |
| AI LLM | Claude 3.5 Sonnet | RAG 답변 생성, 해석 |
| AI Embedding | OpenAI `text-embedding-3-small` | 질의/문서 임베딩 |
| PDF Parsing | OpenDataLoader PDF v2.0 | 모집요강 PDF 파싱 |
| Deployment | Vercel | 서비스 배포 |
| Testing | Jest, Supabase Local, Manual E2E | 단위/통합/시나리오 검증 |

## 문서 목록 (Documentation)

| 문서 | 설명 |
|---|---|
| [01 PRD](./docs/01_PRD.md) | 제품 요구사항 정의서 (기능 범위, 우선순위) |
| [02 시스템 설계](./docs/02_SYSTEM_DESIGN.md) | 아키텍처, 투 트랙 엔진, 디렉토리 구조 |
| [03 DB 스키마](./docs/03_DB_SCHEMA.md) | Supabase 테이블 정의, ER 다이어그램, SQL |
| [04 API 명세](./docs/04_API_SPEC.md) | API Route 엔드포인트, 요청/응답 스키마 |
| [05 AI 파이프라인](./docs/05_AI_PIPELINE.md) | RAG 설계, 프롬프트 전략, 비용 추정 |
| [06 테스트 계획](./docs/06_TEST_PLAN.md) | Unit/Integration/E2E 전략·케이스 개요 |
| [07 테스트 스펙](./docs/07_TEST_SPEC.md) | Track 1·챗봇 단위·라우트 테스트 케이스 ID |
| [08 사용자 매뉴얼](./docs/08_USER_MANUAL.md) | 최종 사용자 기능 안내 |

## 개발 로드맵

- [ ] Week 1: Data Foundation (DB 세팅, 초기 데이터 적재)
- [ ] Week 2: UI & Dashboard (성적 입력, 합격 신호등)
- [ ] Week 3: AI RAG Pipeline (챗봇, 세특 분석)
- [ ] Week 4: Deployment & QA (Vercel 배포, 가족 공유)

## 로컬 개발 환경 세팅

```bash
# 1. 레포 클론
git clone https://github.com/univ4/app.git
cd app

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일에 API 키 입력

# 4. Supabase 로컬 에뮬레이터 실행
npx supabase start

# 5. DB 마이그레이션 적용
npx supabase db push

# 6. 개발 서버 실행
npm run dev
```

## 환경변수 목록

`.env.local.example` 기준:

| 변수명 | 설명 | 필수 여부 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL | 필수 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 익명 키 | 필수 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 서비스 롤 키 (서버 전용) | 필수 |
| SUPABASE_DB_URL | Supabase DB 연결 문자열 (마이그레이션/스크립트용) | 필수 |
| ANTHROPIC_API_KEY | Claude 3.5 Sonnet API 키 | 필수 |
| ANTHROPIC_MODEL | Claude 모델명 (예: claude-3-5-sonnet-20241022) | 필수 |
| OPENAI_API_KEY | `text-embedding-3-small` API 키 | 필수 |
| OPENAI_EMBEDDING_MODEL | 임베딩 모델명 (기본: text-embedding-3-small) | 필수 |
| MEDICAL_SHIFT_DISCOUNT_FACTOR | 2026 의대 증원 보정 계수 (예: -3.2) | 필수 |

## 주의사항 및 면책조항

- 본 프로젝트는 가족 전용 토이 프로젝트이며 상업적 사용을 금지한다.
- 챗봇 답변 및 합격 가능성 분석은 참고용이며, 최종 지원 결정은 반드시 공식 모집요강을 기준으로 한다.
- API 키를 GitHub에 절대 커밋하지 말 것 (`.env.local`은 `.gitignore`에 포함).

## 라이선스

MIT License

