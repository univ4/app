# API Specification (Next.js App Router)

`docs/01_PRD.md`, `docs/02_SYSTEM_DESIGN.md`, `docs/03_DB_SCHEMA.md`를 기준으로 작성한 API 명세서입니다.

## 1. 공통 사항

- 기본 URL: `https://univ4.vercel.app/api`
- 인증 방식: Supabase JWT Bearer 토큰
  - `Authorization: Bearer <supabase_access_token>`
- 기본 전제:
  - `Admin(아빠)`: 쓰기/삭제/적재 가능
  - `Viewer(아들/엄마)`: 조회 중심
  - 모든 데이터 접근은 RLS + 서버 권한 체크를 함께 적용

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

요청 Body (모의고사 예시):

```json
{
  "record_type": "MOCK_EXAM",
  "exam_date": "2026-06-04",
  "korean_standard": 131,
  "korean_percentile": 96,
  "korean_grade": 1,
  "math_standard": 145,
  "math_percentile": 98,
  "math_grade": 1,
  "english_grade": 2,
  "sci1_subject": "물리학II",
  "sci1_standard": 68,
  "sci1_percentile": 97,
  "sci2_subject": "화학II",
  "sci2_standard": 65,
  "sci2_percentile": 94
}
```

요청 Body (내신 예시):

```json
{
  "record_type": "SCHOOL_GPA",
  "exam_date": "2026-02-01",
  "subject": "수학I",
  "raw_score": 92,
  "score_mean": 68.4,
  "score_stddev": 15.2,
  "enrolled_count": 187,
  "credit_unit": 4,
  "grade": 2,
  "achievement": null
}
```

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
        "korean_standard": 131,
        "math_standard": 145,
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

### DELETE `/api/scores/:id`

설명:
- 성적 1건 삭제
- App Router 기준 구현 경로: `src/app/api/scores/[id]/route.ts`
- 권한: `Admin`만 허용

성공 응답 예시:

```json
{
  "data": {
    "deleted_id": 1024
  },
  "error": null
}
```

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

### GET `/api/analysis/z-score`

설명:
- 특정 과목 Z점수 및 고교 수준 판별 결과 반환
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

설명:
- 요강 RAG 챗봇 질의
- `stream=true`면 SSE 스트리밍 반환, `false`면 JSON 단일 응답 반환
- 권한: `Admin`, `Viewer` 허용

요청 Body:

```json
{
  "message": "서강대 논술전형 수능 최저학력기준 알려줘",
  "university_filter": "서강대",
  "admission_type_filter": "논술전형",
  "stream": true
}
```

처리 로직:
1. 질문을 OpenAI `text-embedding-3-small`로 벡터화
2. Supabase pgvector에서 메타데이터 필터 적용 후 유사 청크 Top-5 검색
3. 시스템 프롬프트 + 청크 컨텍스트 + 학생 성적 데이터 요약을 Claude 3.5 Sonnet에 전달
4. Claude가 수치 계산 필요 시 Tool Use로 Track 1 함수 호출
5. 스트리밍 또는 단일 JSON 응답 반환

SSE 응답 예시 (`stream=true`):

```txt
event: chunk
data: {"text":"서강대 논술전형의 수능 최저는 ..."}

event: done
data: {"finish_reason":"stop"}
```

JSON 응답 예시 (`stream=false`):

```json
{
  "data": {
    "answer": "서강대 논술전형 수능최저는 ...",
    "citations": [
      {
        "university_name": "서강대",
        "admission_year": 2026,
        "admission_type": "논술전형",
        "chunk_id": 881
      }
    ]
  },
  "error": null
}
```

### Claude Tool Use 명세 (Anthropic API 형식)

`/api/chat`에서 Claude가 호출 가능한 도구 정의:

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

## 5. 입시 캘린더 API (`/api/schedules`)

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

## 7. 구현 메모 (권장)

```txt
src/app/api/scores/route.ts
src/app/api/scores/[id]/route.ts
src/app/api/analysis/probability/route.ts
src/app/api/analysis/z-score/route.ts
src/app/api/chat/route.ts
src/app/api/schedules/route.ts
src/app/api/schedules/[id]/route.ts
src/app/api/ingest/guideline/route.ts
src/middleware.ts
```

권장 사항:
- 입력값 검증은 `zod` 스키마로 엔드포인트별 분리
- `error.code`는 공통 코드 체계를 강제
- `stream=true` 요청은 타임아웃(예: 30초)과 중단 처리(`AbortSignal`) 지원

