# API Specification (Next.js App Router)

**현행 요구**: [`docs/01_PRD_v2.md`](./01_PRD_v2.md) · **로드맵 정본**: [`docs/05_ROADMAP.md`](./05_ROADMAP.md)  
참고: [`docs/02_SYSTEM_DESIGN.md`](./02_SYSTEM_DESIGN.md), [`docs/02_SYSTEM_ARCHITECTURE.md`](./02_SYSTEM_ARCHITECTURE.md), [`docs/03_DB_SCHEMA.md`](./03_DB_SCHEMA.md), [`docs/03_DATA_MODEL.md`](./03_DATA_MODEL.md)

## 1. 공통 사항

- 기본 URL: `https://univ4.vercel.app/api`
- 인증 방식: Supabase JWT Bearer 토큰
  - `Authorization: Bearer <supabase_access_token>`
- 기본 전제:
  - `Admin`: 쓰기/삭제/적재·룰 관리
  - `Viewer(수험생/학부모)`: 조회 중심·챗봇 질의
  - 모든 데이터 접근은 RLS + 서버 권한 체크를 함께 적용 (PRD v2: 사용자별 격리 + 이메일 인증 가입)

공통 응답 포맷:

```json
// 성공
{ "data": { "...": "..." }, "error": null }
```

```json
// 실패
{ "data": null, "error": { "code": "ERROR_CODE", "message": "설명" } }
```

공통 에러 코드:

| 코드 | HTTP Status | 설명 |
|---|---|---|
| UNAUTHORIZED | 401 | 인증 토큰 없음 또는 만료 |
| FORBIDDEN | 403 | 권한 없음 (타인 데이터 접근 시도) |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 422 | 입력값 유효성 오류 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |

---

## 2. 성적 관리 API (`/api/scores`)

### POST `/api/scores`

설명:
- 모의고사 또는 내신 성적 1건 등록
- `record_type`에 따라 필수 필드가 달라짐
- 권한: `Admin`만 허용

요청 Body (모의고사 예시 — 실제 스키마는 `src/app/api/scores/route.ts`의 `mockExamSchema`와 동일):

```json
{
  "record_type": "MOCK_EXAM",
  "exam_date": "2026-06-04",
  "korean_standard_score": 131,
  "korean_percentile": 96,
  "korean_grade": 1,
  "math_standard_score": 145,
  "math_percentile": 98,
  "math_grade": 1,
  "english_grade": 2,
  "sci1_subject": "물리학Ⅱ",
  "sci1_standard_score": 68,
  "sci1_percentile": 97,
  "sci2_subject": "화학Ⅱ",
  "sci2_standard_score": 65,
  "sci2_percentile": 94
}
```

- `korean_standard_score` / `math_standard_score`는 선택 필드(미입력 시 DB에 null).

요청 Body (내신 예시 — 보통교과):

```json
{
  "record_type": "SCHOOL_GPA",
  "semester": "3-1",
  "subject_category": "general",
  "subject_name": "수학I",
  "credit_unit": 4,
  "total_score": 95,
  "raw_score": 92,
  "avg_score": 68.4,
  "stddev_score": 15.2,
  "student_count": 187,
  "class_rank": 12,
  "rank_total": 187,
  "school_grade": 2,
  "achievement_level": ""
}
```

- `semester`: `1-1` | `1-2` | `2-1` | `2-2` | `3-1` | `3-2` (NEIS 학기)
- `subject_category`: `general`(보통교과) | `career_choice`(진로선택) | `pe_art`(체육·예술)
- `subject_category`에 따라 필수 필드가 달라짐(진로선택: 석차·석차등급 없음, 체육·예술: 합계·평균·표준편차·수강자수·석차 관련 없음). 서버는 학기 정렬용 `exam_date`를 내부에서 학기 코드에 매핑해 저장함.

성공 응답 예시:

```json
{
  "data": {
    "id": 1024,
    "student_id": "f8b9f0f1-1111-2222-3333-444444444444",
    "record_type": "MOCK_EXAM",
    "exam_date": "2026-06-04",
    "created_at": "2026-06-04T12:01:22.313Z"
  },
  "error": null
}
```

---

### GET `/api/scores`

설명:
- 아들의 성적 이력 조회
- 권한: `Admin`, `Viewer` 허용 (본인/가족 범위만)

Query Params:

```txt
type=MOCK_EXAM|SCHOOL_GPA (optional)
limit=20 (optional, default 20, max 100)
offset=0 (optional, default 0)
```

성공 응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": 1024,
        "record_type": "MOCK_EXAM",
        "exam_date": "2026-06-04",
        "korean_standard_score": 131,
        "math_standard_score": 145,
        "english_grade": 2
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 57
    }
  },
  "error": null
}
```

---

### GET `/api/scores/zscore`

설명:
- 로그인 학생의 **내신**(`record_type = SCHOOL_GPA`) 행을 읽어 과목별 Z점수와 전체 평균 Z·참고 밴드를 산출한다.
- Track 1: `calculateZScore`, `calcSchoolLevel` 사용.
- **PRD P1-2**: 원점수·과목평균·표준편차·수강자수가 모두 유효한 행만 Z 산출에 포함한다(미충족 행은 목록에 포함되나 `zScore`는 `null`·사유 문자열).
- 권한: `GET /api/scores`와 동일(인증 사용자, RLS로 본인 `academic_records`만).

성공 응답 예시:

```json
{
  "data": {
    "subjects": [
      {
        "id": 12,
        "semester": "3-1",
        "subjectName": "수학Ⅰ",
        "subjectCategory": "general",
        "zScore": 1.55,
        "bandLabel": "상위권",
        "omitReason": null
      }
    ],
    "schoolLevel": {
      "avgZScore": 1.55,
      "levelLabel": "상위권",
      "subjectZScores": [{ "subjectName": "3-1 · 수학Ⅰ", "zScore": 1.55 }],
      "disclaimer": "학생부종합 참고지표로만 활용하세요."
    }
  },
  "error": null
}
```

| HTTP | `error.code` | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 미로그인 |
| 500 | `INTERNAL_ERROR` | DB 조회 실패 |

---

### DELETE `/api/scores/:id` *(미구현)*

설명:
- 성적 1건 삭제(스펙 예정)
- **현재 레포에는** `src/app/api/scores/[id]/route.ts`가 없으며, `GET`·`POST`만 `src/app/api/scores/route.ts`에 구현되어 있다.

성공 응답(구현 시 예시):

```json
{
  "data": {
    "deleted_id": 1024
  },
  "error": null
}
```

---

### GET `/api/signals`

설명:
- `admission_records` 컷과 학생 성적(`academic_records` 모의고사·내신)을 매칭해 **전형별 신호등**을 일괄 산출 (P0-4 · P1-17).
- Track 1: `calcAdmissionSignal` + `calculateSuneungScore` / `calculateSusiGPA` (규칙 테이블이 없으면 교과는 전체 평균 등급으로 폴백).
- 권한: 로그인 사용자만. `studentId`는 **본인 UUID**만 허용(타인 조회 시 `403`).

Query Params:

```txt
studentId=<uuid>   (optional, 기본: 토큰의 auth.uid())
admissionYear=2026 (optional, 기본 2026)
medShift=0|1       (optional, 1이면 행별 med_shift_coeff를 컷에 가산)
```

- 잘못된 쿼리(범위 밖 `admissionYear`, 잘못된 `medShift` 등) → `422` `VALIDATION_ERROR`.
- `studentId`가 토큰의 `auth.uid()`와 다름 → `403` `FORBIDDEN`.

성공 응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": 1,
        "university_name": "서강대",
        "admission_name": "자연계열",
        "admission_type": "정시",
        "track": "자연",
        "region": "seoul",
        "cutoff": 928.6,
        "adjusted_cutoff": 928.6,
        "my_score": 932.4,
        "signal": "moderate",
        "probability": 0.7,
        "probability_percent": 70,
        "gap": 3.8,
        "med_shift_applied": false
      }
    ],
    "meta": {
      "admission_year": 2026,
      "row_count": 3393,
      "unique_universities": 199,
      "duration_ms": 1200,
      "med_shift_enabled": false,
      "has_mock_exam": true,
      "has_school_gpa": true
    }
  },
  "error": null
}
```

구현 경로: `src/app/api/signals/route.ts`, `src/lib/signals/buildAdmissionSignalRows.ts`, `src/lib/calculators/calcAdmissionSignal.ts`.

---

### POST `/api/gachaejeom` — P1-10 수능 가채점 환산

설명:

- 가채점 **원점수** 입력 → Track 1 `calcGachaejeomScore`로 **추정 표준점수·백분위**(근사) 산출.
- 동일 추정 표준점수 + 영어 등급으로 `calculateSuneungScore`를 적용해 **요강 18개 대학**(`BROCHURE_EIGHTEEN_UNIVERSITY_NAMES`)·`major_group = 자연계열`·`university_scoring_rules` 기준 **환산점수**를 계산한다.
- `admission_records`에서 해당 연도·`정시`·컷이 있는 행을 대학별 1건(먼저 적재된 `id` 우선)으로 매칭해 `calcAdmissionSignal`로 **신호등**을 붙인다.
- 탐구2 과목명에 `Ⅱ`가 포함되면 `parseSci2IsTypeTwo`와 동일하게 과탐Ⅱ 가산 반영.
- 권한: 로그인 사용자만 (`401`). 영어 등급이 **모든** 반환 대상 규칙 행의 `english_conversion_table`에 없으면 `422` (시드 기준 1~5등급).

JSON Body (필수 필드):

| 필드 | 형식 |
|---|---|
| `korean` | `{ rawScore: number, subject: string }` |
| `math` | `{ rawScore: number, subject: string }` |
| `english` | `{ grade: number }` (정수 1~9) |
| `science1` | `{ rawScore: number, subjectName: string }` |
| `science2` | `{ rawScore: number, subjectName: string }` |
| `admissionYear` | (optional) 2020–2035, 기본 2026 |
| `medShift` | (optional) `true` 시 `med_shift_coeff` 컷 가산 |

성공: `{ data: { estimatedScores, warning, univResults[], meta }, error: null }` — `univResults` 항목: `university_name`, `major_group`, `admission_name`, `cutoff`, `adjusted_cutoff`, `converted_score`, `signal`, `probability_percent`, `gap`, `med_shift_applied`.

구현 경로: `src/app/api/gachaejeom/route.ts`, `src/lib/calculators/calcGachaejeomScore.ts`, `src/lib/gachaejeom/*`.

---

### GET `/api/explore` — P1-15 전국 탐색기 · P1-16 조건부 필터

설명:
- `admission_records` 전 연도 행을 로드한 뒤 `buildAdmissionSignalRows`·`calcAdmissionSignal`로 신호등을 산출하고, 쿼리 필터를 적용한다.
- 수능최저·면접 필터는 `susi_gpa_rules`의 `suneung_minimum`·`interview_required`(대학+전형 유형 단위, `20260330230000` 마이그레이션)를 조인해 판정한다. 규칙이 없거나 `interview_required`가 null이면 면접 없음 필터는 엄격 적용(통과하지 않음). 수능최저 없음은 규칙 부재 시 “최저 없음”으로 간주한다.
- 권한: 로그인만. `studentId`는 본인 UUID만 (`403`은 `/api/signals`와 동일).

Query Params:

| 파라미터 | 값 | 기본 |
|---|---|---|
| `studentId` | uuid | 토큰 `auth.uid()` |
| `admissionYear` | 2020–2035 | 2026 |
| `medShift` | `0` \| `1` | `0` |
| `admissionType` | `all` 또는 쉼표 구분 `학생부교과,학생부종합,정시` | all |
| `signal` | `all` 또는 쉼표 구분 `safe,moderate,challenge` | all |
| `region` | `서울` \| `수도권` \| `지방` \| `all` | all |
| `suneungMin` | `true` \| `false` \| `all` | all (`true`=수능최저 없음, `false`=있음; 정시는 없음 필터에 포함) |
| `noInterview` | `true` \| `false` \| `all` | all (`true`=면접 없음, `false`=면접 있음) |

- 잘못된 `admissionType`·`signal` 조합 → `422` `VALIDATION_ERROR`.
- 성공: `{ data: { items: SignalScanRow[], meta: { total, duration_ms } }, error: null }` (`items` 형식은 `GET /api/signals`의 `items`와 동일).
- PRD P0-4 응답 시간: 설계상 DB+메모리 필터만 사용; 클라이언트·테스트에서 `duration_ms` 3000ms 미만을 점검한다.

구현 경로: `src/app/api/explore/route.ts`, `src/lib/explore/applyExploreFilters.ts`, `src/lib/explore/susiRuleHelpers.ts`.

---

### GET `/api/nulsul` — P1-3 논술전형 실질 경쟁률 판독기(목록)

설명:

- `admission_records`에서 `admission_type = 논술전형`인 행만 조회한다. UI에서 명목 경쟁률(`competition_ratio`) 자동 로드에 사용한다.
- 실질 경쟁률 수식은 Track 1 `calcRealCompetitionRate` (`src/lib/calculators/calcRealCompetitionRate.ts`) — 클라이언트 또는 서버에서 동일 함수로 산출.

권한: 로그인 사용자만 (`401` 비인증).

Query Params:

| 파라미터 | 값 | 기본 |
|---|---|---|
| `admissionYear` | 2020–2035 정수 | 2026 |

- 잘못된 `admissionYear` → `422` `VALIDATION_ERROR`.
- DB 오류 → `500` `INTERNAL_ERROR`.

성공: `{ data: { items: NulsulAdmissionItem[], meta: { admission_year, row_count } }, error: null }`

`NulsulAdmissionItem` 필드: `id`, `univ_name`, `dept_name`, `admission_type`, `year`, `competition_ratio` (nullable).

구현 경로: `src/app/api/nulsul/route.ts`, 타입 `src/lib/nulsul/types.ts`.

---

### GET/POST `/api/simulator` — P1-7 원서 배분 시뮬레이터

설명:
- 학생별 저장된 **수시 6장 포트폴리오**(카드 JSON)를 조회·저장한다.
- 권한: 로그인 사용자만. `student_id`는 항상 `auth.uid()`(본인).

**GET** 성공 응답:

```json
{
  "data": {
    "portfolio": {
      "id": "uuid",
      "student_id": "uuid",
      "cards": [],
      "created_at": "2026-03-30T00:00:00.000Z"
    }
  },
  "error": null
}
```

- 저장 전이면 `portfolio`는 `null`일 수 있다.

**POST** 요청 본문:

```json
{
  "cards": [
    {
      "university": "서강대",
      "department": "자연계열",
      "admissionType": "학생부교과",
      "signal": "moderate",
      "hasSuneungMinimum": false,
      "admissionRecordId": 1
    }
  ]
}
```

- `cards`: **최대 6개**. `signal` ∈ `safe` | `moderate` | `challenge`. `admissionRecordId`는 선택.
- 검증 실패(형식·개수 초과) → `422` `VALIDATION_ERROR`.

**POST** 성공 시 `data.portfolio`에 upsert된 행을 반환한다.

Track 1(클라이언트·요약 UI): `calcPortfolioRisk`, `calcNapchiRisk` (`src/lib/calculators/`).

구현 경로: `src/app/api/simulator/route.ts`, 테이블 `simulator_portfolios` (`docs/03_DATA_MODEL.md` §7).

---

## 3. 합격 가능성 분석 API (`/api/analysis`)

### GET `/api/analysis/probability`

설명:
- 최신 성적 기준으로 목표 대학별 합격 가능성 계산
- 권한: `Admin`, `Viewer` 허용

Query Params:

```txt
universities=서강대,성균관대,한양대
admission_type=정시|학생부교과
```

처리 로직:
1. `students`, `academic_records`에서 학생 최신 성적 로드
2. `university_scoring_rules` 또는 `susi_gpa_rules`에서 대학별 규칙 로드
3. Track 1 계산 엔진 호출 (`calculateSuneungScore` 또는 `calculateSusiGPA`)
4. `converted_standard_scores`에서 변환표준점수 매핑
5. `calculateAdmissionProbability`로 2026 의대 증원 보정 계수 적용 후 신호등 산출

응답 예시:

```json
{
  "data": [
    {
      "university": "서강대",
      "major_group": "자연계열",
      "converted_score": 924.5,
      "cutline_70": 918.2,
      "probability": "적정",
      "discount_applied": true,
      "discount_reason": "2026 의대 증원 연쇄 이동 보정 (-3.2점)"
    }
  ],
  "error": null
}
```

---

### GET `/api/analysis/z-score` *(스펙 초안; 구현은 `/api/scores/zscore`)*

설명:
- 특정 과목 Z점수 및 고교 수준 판별 결과 반환
- **구현됨:** 내신 연동·대시보드 성적 탭은 [`GET /api/scores/zscore`](#get-apiscoreszscore)를 사용한다.
- 권한: `Admin`, `Viewer` 허용

Query Params:

```txt
subject=수학I
grade=2
```

처리:
- `academic_records`에서 `원점수/평균/표준편차/수강자수` 로드
- `calculateZScore(rawScore, mean, stddev)` 호출
- 학교 밀집도 참고 해석(`학생부종합 참고지표`) 반환

응답 예시:

```json
{
  "data": {
    "subject": "수학I",
    "grade": 2,
    "z_score": 1.55,
    "density_band": "상위 밀집",
    "interpretation": "학생부종합 정성평가 참고지표로 활용"
  },
  "error": null
}
```

---

## 4. AI 챗봇 API (`/api/chat`)

### POST `/api/chat`

**웹 UI:** 대시보드 → AI 요강 챗봇 (`/dashboard/chat`) — 세션 쿠키로 동일 엔드포인트 호출·SSE 표시.

설명:
- 요강 RAG 챗봇 질의(보유 자료: 18개 대학 전형계획·정시자료 청크만 근거)
- 응답은 **항상 SSE**(`text/event-stream`) 스트리밍
- 출처 형식: **대학명/연도/전형/섹션** — 청크 `metadata.citation_hint` 우선, 없으면 컬럼·`page_section`으로 구성
- 관련 청크 **0건**이면 본문 없이 즉시 **`확인 불가`** 한 줄만 스트리밍 후 `done` (Claude 미호출)
- 수치·환산·확률 계산은 LLM이 수행하지 않음 — 시스템 프롬프트로 앱 **분석·계산기** 이용 안내
- 일일 호출 상한: 환경변수 `CHAT_DAILY_LIMIT`(기본 50, UTC 일자 기준 `try_consume_chat_quota`)
- 유사도 하한: 환경변수 `CHAT_SIMILARITY_THRESHOLD`(기본 **0.55**, 코사인 유사도). RPC `match_guideline_chunks`에서 하한 미만 청크는 제외
- 권한: 로그인 사용자(`Admin`, `Viewer`). 세션 쿠키 또는 `Authorization: Bearer`(액세스 토큰). 비로그인 **401**

요청 Body:

```json
{
  "message": "서강대 논술전형 수능 최저학력기준 알려줘",
  "univName": "서강대",
  "year": 2027
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `message` | string | 예 | 질문 본문 |
| `univName` | string | 아니오 | 있으면(앞뒤 공백 제거 후) RPC `filter`에 **`univ_name` 필수 포함**·`match_count` **10**으로 해당 대학 청크만 검색(청크 `metadata` 키와 동일) |
| `year` | number | 아니오 | 있으면 동일 RPC `filter`에 `year` 포함 |

처리 로직:
1. `try_consume_chat_quota`로 일일 한도 확인·1회 소비
2. 질문을 OpenAI `text-embedding-3-small`로 벡터화
3. RPC `match_guideline_chunks`(`query_embedding`, `match_count`, **`filter` jsonb**, `match_threshold`)로 코사인 유사도 상위 검색(하한 미만 제외). `univName` 없음: `match_count` **5**; 있음: **10**이며 `filter`에 `univ_name` 반드시 포함. `year` 있으면 `filter`에 `year` 포함
4. 청크가 있으면 시스템 프롬프트 + 청크 컨텍스트를 **Claude 3.5 Sonnet**(스트리밍)에 전달
5. SSE로 텍스트 델타 전달 후 `done`에 `citations` 배열 포함

오류 응답(JSON, 스트림 이전 단계):

| HTTP | `error.code` | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 미로그인 |
| 400 | `VALIDATION_ERROR` | 본문 스키마 불일치 |
| 429 | `RATE_LIMIT` | 일일 한도 초과 |
| 500 | `INTERNAL_ERROR` | 임베딩·DB·환경 설정 오류 등 |
| 502 | `INTERNAL_ERROR` | Anthropic API 비정상 응답 |

SSE 응답 예시:

```txt
event: chunk
data: {"text":"서강대 논술전형의 수능 최저는 ..."}

event: done
data: {"finish_reason":"stop","citations":[{"university_name":"서강대","admission_year":2027,"admission_type":"논술전형","chunk_id":881,"citation_hint":"서강대/2027/논술전형/..."}]}
```

청크 0건 시:

```txt
event: chunk
data: {"text":"확인 불가"}

event: done
data: {"finish_reason":"no_context","citations":[]}
```

### Claude Tool Use 명세 (Anthropic API 형식)

**구현 상태(MVP):** 현재 `POST /api/chat`는 **RAG 전용**이며 아래 도구는 API에 **연결되어 있지 않다**. 수치·환산은 시스템 프롬프트로 앱 분석·계산 기능 안내만 한다. Tool Use 연동은 후속 작업.

`/api/chat`에서 Claude가 호출 가능한 도구 정의(계획):

```json
[
  {
    "name": "calculateSuneungScore",
    "description": "정시 환산점수를 계산한다. 변환표준점수, 반영비율, 영어 환산, 과탐II 가산점을 반영한다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "studentId": { "type": "string", "format": "uuid" },
        "universityName": { "type": "string" },
        "majorGroup": { "type": "string" },
        "admissionYear": { "type": "integer" }
      },
      "required": ["studentId", "universityName", "majorGroup", "admissionYear"],
      "additionalProperties": false
    }
  },
  {
    "name": "calculateSusiGPA",
    "description": "학생부교과 내신 환산 등급을 계산한다. 반영 교과와 진로선택 환산 규칙을 적용한다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "studentId": { "type": "string", "format": "uuid" },
        "universityName": { "type": "string" },
        "admissionYear": { "type": "integer" }
      },
      "required": ["studentId", "universityName", "admissionYear"],
      "additionalProperties": false
    }
  },
  {
    "name": "calculateZScore",
    "description": "과목의 Z점수를 산출한다. 원점수, 평균, 표준편차를 입력받는다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "rawScore": { "type": "number" },
        "mean": { "type": "number" },
        "stddev": { "type": "number", "exclusiveMinimum": 0 }
      },
      "required": ["rawScore", "mean", "stddev"],
      "additionalProperties": false
    }
  },
  {
    "name": "getAdmissionCutline",
    "description": "대학/전형/계열 기준 입결 70% 컷을 조회한다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "universityName": { "type": "string" },
        "admissionType": { "type": "string", "enum": ["정시", "학생부교과", "학생부종합", "논술전형"] },
        "majorGroup": { "type": "string" },
        "admissionYear": { "type": "integer" }
      },
      "required": ["universityName", "admissionType", "admissionYear"],
      "additionalProperties": false
    }
  },
  {
    "name": "getRealCompetitionRate",
    "description": "논술전형 실질 경쟁률을 조회한다. 수능최저 충족률과 결시율 보정을 포함한다.",
    "input_schema": {
      "type": "object",
      "properties": {
        "universityName": { "type": "string" },
        "admissionYear": { "type": "integer" },
        "nominalRate": { "type": "number", "exclusiveMinimum": 0 },
        "minimumSatisfactionRate": { "type": "number", "minimum": 0, "maximum": 1 },
        "absenceRate": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "required": ["universityName", "admissionYear", "nominalRate", "minimumSatisfactionRate", "absenceRate"],
      "additionalProperties": false
    }
  }
]
```

---

## 5. 입시 캘린더 API (`/api/schedules`) *(레포 미구현)*

> **구현된 가족 캘린더**는 [§5b `/api/calendar`](#5b-가족-공용-입시-캘린더-api-apicalendar--p0-5)를 사용한다. 아래 `/api/schedules` 절은 설계·PRD 참고용이다.

### GET `/api/schedules`

설명:
- 월 단위 일정 목록 조회
- 권한: `Admin`, `Viewer` 허용

Query Params:

```txt
month=2026-09
university=서강대
```

응답 예시:

```json
{
  "data": {
    "month": "2026-09",
    "items": [
      {
        "id": 11,
        "university_name": "서강대",
        "event_name": "논술 원서접수 마감",
        "event_type": "수시",
        "event_date": "2026-09-18T15:00:00+09:00",
        "description": "온라인 접수 마감",
        "is_completed": false
      }
    ]
  },
  "error": null
}
```

---

### POST `/api/schedules`

설명:
- 일정 생성
- 권한: `Admin`만 허용

요청 Body:

```json
{
  "university_name": "서강대",
  "event_name": "논술 고사일",
  "event_type": "수시",
  "event_date": "2026-11-14T09:00:00+09:00",
  "description": "고사장 입실 08:30"
}
```

응답 예시:

```json
{
  "data": {
    "id": 203,
    "university_name": "서강대",
    "event_name": "논술 고사일"
  },
  "error": null
}
```

---

### PATCH `/api/schedules/:id`

설명:
- 일정 완료 상태(`is_completed`) 토글
- App Router 기준 구현 경로: `src/app/api/schedules/[id]/route.ts`
- 권한: `Admin`만 허용

요청 Body:

```json
{
  "is_completed": true
}
```

응답 예시:

```json
{
  "data": {
    "id": 203,
    "is_completed": true
  },
  "error": null
}
```

---

## 5b. 가족 공용 입시 캘린더 API (`/api/calendar`) — P0-5

설명: 학생 계정(`students.id` = `auth.uid()`) 단위의 `calendar_events` CRUD. 최초 조회 시 RPC `ensure_default_admission_calendar_2027()`로 `ADMISSION_SCHEDULE_2027` 기준 기본 4건이 idempotent 삽입된다.

공통 응답: `{ data, error }` (`error`는 `{ code, message }`).

### GET `/api/calendar`

- 권한: 인증 사용자(본인 `student_id` 행만 조회).
- 처리: `ensure_default_admission_calendar_2027` 호출 후 `calendar_events` 목록(날짜·제목 오름차순).

응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "student_id": "uuid",
        "title": "수능",
        "event_date": "2026-11-12",
        "event_type": "수능",
        "university": null,
        "alert_days": [7, 3, 1, 0],
        "note": null,
        "created_at": "2026-03-30T12:00:00.000Z"
      }
    ]
  },
  "error": null
}
```

### POST `/api/calendar`

- 권한: `students.role = 'admin'`만.
- 성공: `201 Created`, `{ data: { item: … }, error: null }`.
- Body: `title`, `event_date` (`YYYY-MM-DD`), `event_type` (`원서접수` \| `수능` \| `정시` \| `면접` \| `논술` \| `기타`), `university?`, `alert_days` (정수 배열, 1~20개), `note?`.

### PUT `/api/calendar/[id]`

- 권한: Admin만, 본인 `student_id` 행만.
- Body: 위 필드 부분 갱신(최소 1필드).

### DELETE `/api/calendar/[id]`

- 권한: Admin만, 본인 `student_id` 행만.
- 응답: `{ data: { deleted_id }, error: null }`

### GET `/api/calendar/todos` — P1-12 역산 TO-DO

- 권한: 인증 사용자(본인 `student_id` 일정만 기준).
- 처리: `ensure_default_admission_calendar_2027` 호출 후 `calendar_events` 목록을 읽고, `원서접수`·`수능`·`정시` 유형에 대해 오늘 기준 D-Day로 `calcAdmissionTodos` 템플릿을 적용해 합친다. 지난 일정(`dday < 0`)·`면접`/`논술`/`기타`는 TO-DO에서 제외된다.

응답 예시:

```json
{
  "data": {
    "todos": [
      {
        "timing": "D-30",
        "task": "목표 대학 최종 6장 결정",
        "category": "prepare",
        "event_id": "uuid",
        "event_title": "수시 원서접수 시작",
        "event_date": "2026-09-07",
        "event_type": "원서접수",
        "dday": 162,
        "dday_label": "D-162"
      }
    ]
  },
  "error": null
}
```

---

## 5c. 생활기록부 API (`/api/student-record/*`) — P1 입력 폼

설명: NEIS 대응 구조화 테이블(`docs/08_STUDENT_RECORD_SPEC.md`, `docs/03_DB_SCHEMA.md` §2.15). 공통 응답 `{ data, error }`.

### 대상 학생 ID (`student_id` 쿼리)

- **Viewer**: 쿼리 무시, 항상 `auth.uid()` 행만.
- **Admin**: `?student_id=<uuid>` 가 유효하면 해당 학생 기준으로 조회·쓰기; 없으면 본인 `auth.uid()`.

### GET/POST `/api/student-record/subject-notes`

- **GET**: 인증 사용자. `student_subject_notes` 목록(학년·학기·과목명 오름차순). 응답 `{ data: { items: [...] }, error: null }`.
- **POST**: Admin만. Body: `grade` (1–3), `semester` (1–2), `subject_name`, `note` (1–3000자). `unique (student_id, grade, semester, subject_name)` 위반 시 `409` `CONFLICT`.

### PUT/DELETE `/api/student-record/subject-notes/[id]`

- **Admin만**. 해당 `id` 행의 `student_id`가 위 `recordStudentId`와 일치할 때만 갱신·삭제. 없으면 `404` `NOT_FOUND`.

### GET/POST `/api/student-record/activities`

- **GET**: 인증. `student_activities` 목록.
- **POST**: Admin만. Body: `grade`, `activity_type` (`자율활동` \| `동아리활동` \| `진로활동`), `hours?`, `hope_field?` (진로만), `content` (1–3000자). `unique (student_id, grade, activity_type)` 위반 시 `409`.

### PUT/DELETE `/api/student-record/activities/[id]`

- Admin만, 대상 행 `student_id` 일치 필요.

### GET/POST `/api/student-record/awards`

- **GET**: 인증. `student_awards` 목록.
- **POST**: Admin만. Body: `grade`, `semester`, `award_name`, `rank?`, `award_date?` (`YYYY-MM-DD` \| null), `organization?`, `participants?`.

### PUT/DELETE `/api/student-record/awards/[id]`

- Admin만, 본 쿼리로 결정된 `recordStudentId`와 행 일치 필요.

### GET/PUT `/api/student-record/behavior`

- **GET**: 인증. `student_behavior` 학년 오름차순 목록.
- **PUT**: Admin만. Body: `grade` (1–3), `content` (1–3000자). 학년당 1행 upsert(있으면 갱신, 없으면 삽입). 성공 시 기존 행 갱신은 `200`, 신규 삽입은 `201`.

### GET/PUT `/api/student-record/attendance`

- **GET**: 인증. `student_attendance` 학년 오름차순 목록(출결 필드 전체).
- **PUT**: Admin만. Body: `grade` (1–3), `school_days?` (0–366 또는 null), 결석·지각·조퇴·결과 각 질병/미인정/기타 정수(0–9999), `note?`. 학년당 1행 upsert. 신규 `201`, 갱신 `200`.

### GET/POST `/api/student-record/volunteer`

- **GET**: 인증. `student_volunteer` 목록(학년·id 오름차순).
- **POST**: Admin만. Body: `grade`, `period`, `organization`, `activity`, `hours`. 삽입 후 동일 학생 전 행에 대해 누계시간(`cumulative_hours`)을 재계산하여 갱신.

### DELETE `/api/student-record/volunteer/[id]`

- Admin만, 행의 `student_id`가 기록 대상과 일치할 때만. 삭제 후 누계 재계산.

### GET/POST `/api/student-record/reading`

- **GET**: 인증. `student_reading` 목록.
- **POST**: Admin만. Body: `grade`, `subject_area?` (null 허용), `content` (1–3000자).

### DELETE `/api/student-record/reading/[id]`

- Admin만, `student_id` 일치 필요.

### GET/POST `/api/student-record/certificates`

- **GET**: 인증. `student_certificates` 목록(`created_at` 오름차순).
- **POST**: Admin만. Body: `cert_type` (`자격증` \| `인증`), `cert_name`, `cert_number?`, `acquired_date?` (`YYYY-MM-DD` \| null), `issuer?`.

### DELETE `/api/student-record/certificates/[id]`

- Admin만, `student_id` 일치 필요.

### GET/POST `/api/student-record/school-violence`

- **GET**: 인증. `student_school_violence` 목록(`decision_date` 내림차순).
- **POST**: Admin만. Body: `grade`, `decision_date` (`YYYY-MM-DD`), `action_detail` (1–3000자).

### DELETE `/api/student-record/school-violence/[id]`

- Admin만, `student_id` 일치 필요.

### POST `/api/student-record/analyze` (P1-5 학종 역량 분석)

- **인증**: 필수. `try_consume_chat_quota`로 일일 호출 한도(`CHAT_DAILY_LIMIT`, 기본 50) 공유.
- **Body (JSON)**:
  - `studentId?` (UUID): 생략 시 본인. **Admin**만 다른 학생 UUID 지정 가능(§5c `student_id` 쿼리와 동일 정책).
  - `targetUniv?` (string, 최대 120자): 목표 대학 맥락(선택). 생기부 청크에 없는 내용은 추측하지 않음.
- **처리**:
  1. 대상 학생의 `student_record_chunks` **전체** 행을 `id` 오름차순으로 조회.
  2. 청크 0건: SSE로 안내 문구만 전송 후 `done` (`finish_reason: no_context`, `sections: []`).
  3. 청크 1건 이상: Claude Sonnet 스트리밍. 시스템 프롬프트는 생기부 텍스트만 근거로 학업·진로·공동체 역량 분석.
- **응답**: `Content-Type: text/event-stream` (SSE)
  - `event: chunk` — `{ "text": "<델타>" }` 누적
  - `event: done` — `{ "finish_reason": "stop" | "no_context", "sections": [ { "key": "academic"|"career"|"community", "title": string, "content": string } ] }`  
    `sections`는 스트리밍 완료 후 모델 출력에서 `## 학업역량` 등 마크다운 제목 기준 파싱.
- **오류**: 한도 초과 **429** `RATE_LIMIT`; 검증 실패 **400** `VALIDATION_ERROR`; 그 외 **5xx** `INTERNAL_ERROR` / **502** 업스트림.

### POST `/api/student-record/gap-analysis` (P1-4 세특 Gap 분석)

- **인증**: 필수. `try_consume_chat_quota`로 일일 호출 한도(`CHAT_DAILY_LIMIT`, 기본 50) 공유.
- **Body (JSON)**:
  - `studentId?` (UUID): 생략 시 본인. **Admin**만 다른 학생 UUID 지정 가능.
  - `targetUniv` (string, 1–120자): **필수.** 목표 대학명(`guideline_chunks.metadata.univ_name`와 정합).
  - `remainingWeeks?` (number): 남은 기간(주). 기본 **12**, 범위 1–104.
- **처리**:
  1. 대상 학생의 `student_record_chunks` 전체를 `id` 오름차순으로 조회.
  2. 청크 0건: SSE로 안내 문구만 전송 후 `done` (`finish_reason: no_context`, `sections: []`).
  3. OpenAI 임베딩으로 질의 벡터 생성 후 `match_guideline_chunks`(`filter`에 `univ_name`·`year: 2027`, `CHAT_SIMILARITY_THRESHOLD` 하한).
  4. 전형계획 청크 0건: SSE 안내 후 `done` (`finish_reason: no_guidelines`).
  5. 그 외: Claude Sonnet 스트리밍. 시스템 프롬프트에 [학생 세특]·[대학 전형 자료]·주차 기준 액션 플랜 형식 포함(문장 대필 금지).
- **응답**: `Content-Type: text/event-stream` (SSE)
  - `event: chunk` — `{ "text": "<델타>" }` 누적
  - `event: done` — `{ "finish_reason": "stop" | "no_context" | "no_guidelines", "sections": [ { "key": "strengths"|"gaps"|"actions", "title": string, "content": string } ] }`  
    `sections`는 스트리밍 완료 후 `## 강점` / `## 보완점` / `## 액션 플랜` 기준 파싱.
- **오류**: 한도 초과 **429** `RATE_LIMIT`; `targetUniv` 누락·빈 문자열 등 검증 실패 **422** `VALIDATION_ERROR`; JSON 본문 없음 **400**; 그 외 **5xx** / **502** 업스트림.

---

## 6. 데이터 적재 API (`/api/ingest`) - Admin 전용

### POST `/api/ingest/guideline`

설명:
- 요강 PDF 청크 텍스트를 임베딩하여 `guideline_chunks`에 적재
- 운영에서는 `scripts/ingest/` 배치 스크립트 사용을 권장하고, 이 API는 소량 테스트/검증용
- 권한: `Admin`만 허용

요청 Body:

```json
{
  "university_name": "서강대",
  "admission_year": 2026,
  "admission_type": "논술전형",
  "chunks": [
    {
      "text": "수능 최저학력기준: 3개 영역 등급 합 6 이내",
      "metadata": { "카테고리": "수능최저", "모집단위": "자연계열" }
    }
  ]
}
```

처리:
1. OpenAI Embedding API 호출(`text-embedding-3-small`)
2. 임베딩 결과를 `vector(1536)`으로 변환
3. `guideline_chunks` insert

응답 예시:

```json
{
  "data": {
    "inserted": 1,
    "university_name": "서강대",
    "admission_year": 2026
  },
  "error": null
}
```

---

## 7. 선택과목·D-Day·수능최저·생기부·전략 API (P1-11~14, P2-6)

공통: 세션 필수. `studentId` 경로는 **본인(`auth.uid()`)과 일치할 때만** 허용; 아니면 `FORBIDDEN`.

### GET `/api/subject-analysis` *(구현)*

설명: 로그인 학생의 `subject_profiles`(2027) + `students.target_universities` + `univ_subject_requirements` + `university_scoring_rules`(자연계열, 연도 최신)로 지원 가능 집계 및 Track1 `calcSubjectAdvantage` 유불리 요약.

성공 응답 `data`:

- `profile`: 저장된 프로필 필드(없으면 `null`)
- `eligibility`: `eligibleUniversityCount`, `totalReferenceUniversities`(199), `universitiesWithRequirementData`, `ineligible[]` (학과별 `reasons`)
- `advantage`: `advantageUnivs`, `disadvantageUnivs`, `neutralUnivs`, `summary`

**Track 1**: `checkSubjectEligibility`, `calcSubjectAdvantage` (`src/lib/calculators/calcSubjectAdvantage.ts`)

---

### POST `/api/subject-analysis/profile` *(구현)*

설명: 선택과목 프로필 upsert(`student_id`+`year=2027` 유니크). 본문에 `year` 필드 없음(서버에서 2027 고정).

요청 Body 필드: `korean_subject`, `math_subject`, `science1`, `science2`, `social1`, `social2`, `second_foreign`(nullable·선택).

성공 응답: `{ data: { id, student_id, year, updated_at }, error: null }`

---

### POST `/api/subject-profile` *(스펙 예정 경로 — 앱 구현은 `POST /api/subject-analysis/profile`)*

설명: 선택과목 프로필 저장(upsert: `student_id`+`year` 유니크).

요청 Body:

```json
{
  "year": 2027,
  "korean_subject": "언어와매체",
  "math_subject": "미적분",
  "science1": "지구과학Ⅰ",
  "science2": null,
  "social1": "사회문화",
  "social2": null,
  "second_foreign": null
}
```

성공 응답:

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "student_id": "f8b9f0f1-1111-2222-3333-444444444444",
    "year": 2027,
    "updated_at": "2026-03-27T12:00:00.000Z"
  },
  "error": null
}
```

---

### GET `/api/subject-profile/[studentId]/eligibility`

설명: 저장된 프로필 + `univ_subject_requirements` 기준 지원 가능 대학 목록(Track1 `checkSubjectEligibility` / `analyzeSubjectAdvantage` 결과).

Query (optional): `year=2027`

성공 응답:

```json
{
  "data": {
    "profile": { "year": 2027, "math_subject": "미적분", "korean_subject": "언어와매체" },
    "advantageous": [{ "university_id": "…", "department_id": "…", "name": "서강대 자연계열" }],
    "disadvantageous": [],
    "ineligible": [{ "university_id": "…", "department_id": "…", "name": "OO대 OO학과", "reasons": ["필수 수학 과목 조건 불충족"] }]
  },
  "error": null
}
```

---

### GET `/api/dday`

설명: 2027학년도 기준 주요 입시 일정별 D-Day(오늘 날짜 기준). Track1 `calcDDay`.

Query (optional): `reference_date=2026-03-27`(ISO 날짜, 테스트용)

성공 응답:

```json
{
  "data": {
    "reference_date": "2026-03-27",
    "events": [
      { "id": "susi_apply_start", "label": "수시 원서접수 시작", "event_date": "2026-09-07", "dday": 164 },
      { "id": "suneung", "label": "수능", "event_date": "2026-11-12", "dday": 230 }
    ]
  },
  "error": null
}
```

**Track 1 (구현)**: `src/lib/calculators/calcDDay.ts`

- `calcDDay(targetDate: string): { dday: number; label: string }` — `targetDate`는 `YYYY-MM-DD`만 허용, 기준일은 호출 시점의 로컬 달력 “오늘”.
- `dday`: 목표일 − 오늘(달력 일 수). 미래는 양수, 과거는 음수.
- `label`: `D-{n}` / `D+{n}` / `D-Day`.
- 주요 2027학년도 일정 상수: `src/lib/constants/schedules.ts` (`ADMISSION_SCHEDULE_2027`).
- API·테스트에서 기준일을 고정하려면 `reference_date` 쿼리(위) 또는 Jest `jest.setSystemTime` 등으로 처리.

**Track 1 (구현, P1-3)**: `src/lib/calculators/calcRealCompetitionRate.ts`

- `calcRealCompetitionRate({ nominalRate, suneungMinimumRate, absenceRate? })` — 실질 경쟁률 = 명목 × 수능최저 충족률 × (1 − 결시율), `diffRate` = 명목 − 실질. `absenceRate` 생략 시 **0.1**. 범위 위반 시 `Error` 메시지에 `ValidationError` 포함.

---

### GET `/api/dday/todos`

설명: 역산 주간 TO-DO(템플릿 + Track2 문구 생성 결과 병합 가능). 최소 5개 항목 목표.

Query (optional): `week_of=2026-09-01`

성공 응답:

```json
{
  "data": {
    "week_start": "2026-09-01",
    "todos": [
      { "id": "1", "due_date": "2026-09-05", "title": "수시 지원 대학 최종 점검", "source": "track1_template" },
      { "id": "2", "due_date": "2026-09-06", "title": "자소서 제출 전 교내 검토", "source": "track2_llm" }
    ]
  },
  "error": null
}
```

---

### GET `/api/analysis/minimum-check`

설명: 로그인 사용자 최신 `MOCK_EXAM` + `susi_gpa_rules.suneung_minimum` 전 행에 대해 `checkSuneungMinimum` 판정. `condition`이 `N개합M` 형태로 파싱되면 같은 입력으로 Track1 `calcSuneungMinimumProbability` 확률을 붙인다.

- 성공: `{ data: { student_grades, results }, error: null }`
- 각 `results` 항목: 기존 `satisfied`, `best_combination`, `gap` 등 + `probability`, `expected_grade_sum`, `risk_level` (`safe` \| `caution` \| `danger` \| `null`). 규칙 비어 있음·파싱 불가·표본 구성 불가 시 확률 필드는 `null`.
- `english_limit`만 있고 `subjects`에 `english`가 없으면, 확률 계산용으로만 모의고사 `english` 등급을 `scores`에 합산(합산 풀은 `subjects` 그대로).

401 `UNAUTHORIZED`, 모의고사 없음 404 `NOT_FOUND`, DB 오류 500 `INTERNAL_ERROR` — `{ data: null, error }` 형식.

### POST `/api/analysis/minimum-check`

설명: 단일 시나리오 수능최저 충족 확률(Track1 `calcSuneungMinimumProbability`). 인증 필요.

요청 Body (JSON): `scores[]` { `subject`, `grade` }, `requirement` { `minGradeSum`, `subjectCount`, `hankoSaRequired`, `hankoSaMaxGrade?`, `englishMaxGrade?` }, 선택 `subjectsForSum[]`, `trend[]`, `sampleCount`, `seed`.

성공: `{ data: { probability, expectedGradeSum, riskLevel }, error: null }` (`probability` 0~1).

입력 검증 실패: 400 `VALIDATION_ERROR`.

---

### GET `/api/suneung-minimum/[studentId]/probability`

설명: 최신 모의고사 + `susi_gpa_rules.suneung_minimum` 기준 충족 확률(%). Track1 `calcSuneungMinimumProbability` 결과의 `probability * 100` 등으로 표현 가능(구현 시).

Query (optional): `year=2027`

성공 응답:

```json
{
  "data": {
    "universities": [
      {
        "university_name": "서강대",
        "admission_type": "학생부교과",
        "probability_percent": 72.5,
        "warning": null
      },
      {
        "university_name": "한양대",
        "admission_type": "학생부교과",
        "probability_percent": 38.0,
        "warning": "BELOW_50_PERCENT"
      }
    ],
    "simulations": [
      { "scenario": "국어 1등급 상승", "delta_percent": 12.3 }
    ]
  },
  "error": null
}
```

**Track 1 (구현)**: `src/lib/calculators/calcSuneungMinimumProbability.ts`

- `calcSuneungMinimumProbability(params)` → `{ probability, expectedGradeSum, riskLevel }` — `probability` ∈ [0,1]. 과목별 점수 등급을 기대값으로 두고, 선택 `trend`가 있으면 회차 등급으로 평균·표준편차를 잡아 **독립 정규 근사 → 반올림 이산 등급** 샘플 후 몬테카를로로 `checkSuneungMinimum`과 동일 규칙의 충족 비율을 추정(한국사·영어 상한은 `requirement`로 반영).
- `subjectsForSum?`: `N개합` 조합에 참가하는 과목 키만 지정. 생략 시 `scores` 중 hankosa 제외 전부가 합산 풀.
- `suneungMinimumRiskLevel(p)`: 매뉴얼 §8 구간 — 0.78 이상 `safe`, 0.5 이상 0.78 미만 `caution`, 0.5 미만 `danger`.
- `parseSuneungMinimumCondition(condition)` (`checkSuneungMinimum.ts`): API·라우트에서 `N개합` 파싱용.

---

### GET `/api/record-check`

설명: 로그인 사용자(또는 관리자 `?student_id=` UUID) 기준 생기부 구조화 데이터를 읽어 공백·글자수 점검. Track1 `calcRecordGapAnalysis` (`detectGibupGap` 별칭). 데이터: `student_subject_notes`, `student_activities`, `student_awards`, `student_behavior`, `students.target_major`(계열 추정용).

쿼리: `student_id` (optional, admin만 타 학생 UUID).

성공 응답:

```json
{
  "data": {
    "items": [
      {
        "section": "세특 (국어)",
        "status": "warning",
        "currentLength": 234,
        "minLength": 500,
        "message": "보완 권장: 500자 미만"
      }
    ],
    "overallScore": 68,
    "criticalCount": 1,
    "targetUnivType": "science"
  },
  "error": null
}
```

- `status`: `good` | `warning` | `critical`
- `targetUnivType`: `science` | `liberal` | `any` (`target_major` 휴리스틱)

에러: `UNAUTHORIZED`(401), `INTERNAL_ERROR`(500).

---

### GET `/api/gibup/[studentId]/gaps`

설명: 생기부(세특·수상·봉사·독서 등) 공백·미달 탐지. Track1 `calcRecordGapAnalysis` / `detectGibupGap`. **구현 경로**: 동일 로직은 `GET /api/record-check`에서 사용한다.

성공 응답:

```json
{
  "data": {
    "items": [
      { "category": "세특", "subject": "수학Ⅰ", "status": "SHORT", "char_count": 120, "threshold": 500, "severity": "critical" }
    ],
    "university_signals": [
      { "university_name": "서강대", "level": "warn", "summary": "보완 권장" }
    ],
    "consistency_score": 62
  },
  "error": null
}
```

---

### GET `/api/strategy/napchi-risk/[studentId]`

설명: 수시 6장·정시 포트폴리오 기반 납치 리스크. Track1 `calcSuneungNapchiRisk`(P2-6).

성공 응답:

```json
{
  "data": {
    "risk_level": "HIGH",
    "reasons": ["수시 안정권 1장만 선택 → 상위권 정시 옵션 축소"],
    "opportunity_cost_estimate": { "currency": "ordinal", "note": "정시 지원 가능 대학 수 감소" }
  },
  "error": null
}
```

---

## 8. PRD v2 확장 API (예정 · 경로 가칭)

스키마·Track 1 확정 후 본 절을 구체 요청/응답 스키마로 대체한다.

| PRD | 설명 | 예상 엔드포인트(가칭) |
|---|---|---|
| P0-4 | 199개 대학 일괄 신호등(3초 이내 AC) | `GET /api/signals` |
| P1-15 | 전국 탐색기(전형·지역·신호등) | `GET /api/explore` |
| P1-16 | 조건부 필터(수능최저·면접 AND) | `GET /api/explore` (`suneungMin`, `noInterview`) |
| P2-9 | 입결 추이 지표 | `GET /api/analysis/cutoff-trends` 등 |
| P2-10 | 정시 군별 조합·패턴 | `POST /api/strategy/jeonsi-groups` 등 |
| P3-4 | 과탐 가산 시뮬 | `POST /api/analysis/science2-bonus` 등 |

---

## 9. 구현 메모 (권장)

### 9.1 현재 레포에 존재하는 API Route (2026-03-30)

**구현됨 (`src/app/api/`):**

```txt
scores/route.ts                          # GET, POST
signals/route.ts                         # GET
gachaejeom/route.ts                      # POST (P1-10)
simulator/route.ts                       # GET, POST (P1-7)
analysis/probability/route.ts            # GET
analysis/minimum-check/route.ts          # GET
chat/route.ts                            # POST
calendar/route.ts                        # GET, POST
calendar/[id]/route.ts                   # PUT, DELETE
student-record/analyze/route.ts          # POST (P1-5 SSE)
student-record/gap-analysis/route.ts     # POST (P1-4 SSE)
student-record/subject-notes/route.ts
student-record/subject-notes/[id]/route.ts
student-record/activities/route.ts
student-record/activities/[id]/route.ts
student-record/awards/route.ts
student-record/awards/[id]/route.ts
student-record/behavior/route.ts
student-record/attendance/route.ts
student-record/volunteer/route.ts
student-record/volunteer/[id]/route.ts
student-record/reading/route.ts
student-record/reading/[id]/route.ts
student-record/certificates/route.ts
student-record/certificates/[id]/route.ts
student-record/school-violence/route.ts
student-record/school-violence/[id]/route.ts
```

**미구현(스펙·PRD만 존재하거나 별도 스크립트):** `scores/[id]`, `/api/schedules`, `/api/ingest/*`, `/api/subject-profile/*`, `/api/dday/*`, 기타 §8 가칭 경로.

아래 블록은 과거 인덱스용 **예정 경로** 목록(참고).

```txt
src/app/api/scores/[id]/route.ts
src/app/api/analysis/z-score/route.ts
src/app/api/schedules/route.ts
src/app/api/schedules/[id]/route.ts
src/app/api/ingest/guideline/route.ts
src/app/api/subject-profile/route.ts
src/app/api/subject-profile/[studentId]/eligibility/route.ts
src/app/api/dday/route.ts
src/app/api/dday/todos/route.ts
src/app/api/suneung-minimum/[studentId]/probability/route.ts
src/app/api/gibup/[studentId]/gaps/route.ts
src/app/api/strategy/napchi-risk/[studentId]/route.ts
src/proxy.ts
```

권장 사항:
- 입력값 검증은 `zod` 스키마로 엔드포인트별 분리
- `error.code`는 공통 코드 체계를 강제
- `stream=true` 요청은 타임아웃(예: 30초)과 중단 처리(`AbortSignal`) 지원

