# 데이터 검증 스크립트

`admission_records`, `guideline_chunks`, `student_record_chunks` 테이블의 데이터 품질을 검사해, 잘못된 값으로 인한 계산·RAG 오류를 사전에 발견합니다.

## 사전 요구 사항

- Node.js 20+
- 환경 변수: `SUPABASE_URL`(또는 `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`
- 로컬에서는 프로젝트 루트의 `.env.local`을 불러올 수 있습니다.

## 실행 방법

### 통합 실행 (권장)

```bash
cd /path/to/app
set -a; source .env.local; set +a
./node_modules/.bin/tsx scripts/validate/run_all_validations.ts
```

동작:

1. `validate_admission_records` → `validate_guideline_chunks` → `validate_student_record_chunks` 순서로 실행
2. 각 테이블별 `[PASS]` / `[WARN]` / `[ERROR]` / `[SUMMARY]` 로그 출력
3. 마지막에 `[RUN_ALL]` 합계(오류·경고 건수)
4. **오류 건수 합계가 1 이상이면** 프로세스 종료 코드 **1** (경고만 있으면 **0**)

### 개별 실행

```bash
./node_modules/.bin/tsx scripts/validate/validate_admission_records.ts
./node_modules/.bin/tsx scripts/validate/validate_guideline_chunks.ts
./node_modules/.bin/tsx scripts/validate/validate_student_record_chunks.ts
```

## 검사 항목

### `validate_admission_records.ts` (`admission_records`)

| 구분 | 조건 |
|------|------|
| 경고 | `cutoff_score`가 null이거나 0 이하 |
| 경고 | `competition_ratio`가 null이거나 0 이하 |
| 오류 | `admission_type`이 허용값이 아님: 학생부교과, 학생부종합, 논술전형, 정시, 실기, 특기자 |
| 경고 | `dept_name`이 null이거나 빈 문자열 |
| 오류 | `univ_name`이 null이거나 빈 문자열 |
| 오류 | `year`가 2020 미만 또는 2030 초과 |
| 경고 | `med_shift_coeff`가 null이 아닌데 0 미만 또는 5 초과 |

### `validate_guideline_chunks.ts` (`guideline_chunks`)

| 구분 | 조건 |
|------|------|
| 경고 | `chunk_text` 길이 50자 미만 |
| 경고 | `chunk_text` 길이 3000자 초과 |
| 오류 | `embedding` 누락(null·빈 배열 등) |
| 오류 | `metadata.univ_name`이 null 또는 빈 값 |
| 오류 | `metadata.year`가 null이거나 숫자로 해석 불가 |
| 경고 | `metadata.citation_hint`가 null 또는 빈 값 |

### `validate_student_record_chunks.ts` (`student_record_chunks`)

| 구분 | 조건 |
|------|------|
| 경고 | `chunk_text` 길이 10자 미만 |
| 오류 | `embedding` 누락 |
| 경고 | `metadata.section`이 세특·창체·행동특성이 아니거나 누락 |
| 오류 | `student_id`가 null 또는 빈 값 |

## GitHub Actions CI

워크플로 `.github/workflows/ci.yml`의 `data-validation` 잡에서 `run_all_validations.ts`를 실행합니다.

- **필수 시크릿**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (DB 조회용)
- 시크릿을 아직 넣지 않은 경우에도 워크플로가 빨간색으로 막히지 않도록 **`continue-on-error: true`** 로 두었습니다. 시크릿 설정 후에는 해당 옵션을 제거하거나 `false`로 바꿔 실패 시 CI를 막도록 조정할 수 있습니다.

로컬과 동일하게, CI에서는 `.env.local` 없이 위 환경 변수만 주입하면 됩니다.

## 관련 코드

- 공통 Supabase 클라이언트·페이징 조회: `scripts/validate/_shared.ts`
- 입결 적재 참고: `scripts/ingest/load_admission_db.ts`
- 요강 청크 적재 참고: `scripts/ingest/embed_and_store.ts`
- 생기부 청크 적재 참고: `scripts/ingest/embed_student_record.ts`
