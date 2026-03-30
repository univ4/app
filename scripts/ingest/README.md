# Ingest 스크립트

data-collector Release·로컬 JSON·NEIS 파싱 결과를 Supabase에 적재한다.

## 공통 환경

- `NEXT_PUBLIC_SUPABASE_URL` 또는 `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 커밋 금지)

선택: `GITHUB_TOKEN` (비공개 Release 자산), `OPENAI_API_KEY` (임베딩), `NEIS_STUDENT_ID` (생기부 적재·임베딩 대상 학생 UUID).

로컬 실행 시:

```bash
set -a && source .env.local && set +a
```

## 실행 순서 (권장)

1. **입결·요강 데이터**  
   - `admission_db.jsonl` → `admission_records`  
     `./node_modules/.bin/tsx scripts/ingest/load_admission_db.ts`  
   - 전형계획·정시 MD (GitHub Release) → `guideline_chunks`  
     `./node_modules/.bin/tsx scripts/ingest/embed_and_store.ts`  
   - 필요 시 Release 자산 fetch: `scripts/ingest/githubReleaseFetch.ts` (모듈)

2. **내신·생활기록부 원본 JSON**  
   - NEIS 성적 → `academic_records`  
     `./node_modules/.bin/tsx scripts/ingest/load_neis_grades.ts` (또는 `parse_neis_grades.ts` 파이프라인 문서 참고)  
   - `record/student_record.json` → 생기부 구조화 테이블  
     `./node_modules/.bin/tsx scripts/ingest/load_student_record.ts`

3. **생활기록부 RAG (`student_record_chunks`)**  
   - 선행: Supabase에 마이그레이션 `20260330250000_student_record_chunks.sql` 적용 (`supabase db push` 등).  
   - 벡터 검색 RPC를 SQL Editor에서만 반영할 경우: `scripts/ingest/match_student_record_chunks.sql` 실행.  
   - 임베딩 적재:  
     `./node_modules/.bin/tsx scripts/ingest/embed_student_record.ts`  
     (`OPENAI_API_KEY` 필요, 청크당 `text-embedding-3-small`, 배치 50)

4. **논술·면접 기출 RAG (`exam_chunks`, P2-4)**  
   - 선행: `20260330280000_exam_chunks.sql` 적용.  
   - 로컬 `record/exam/*.md` 준비(frontmatter에 `univ_name`, `year`, `exam_type` 필수).  
   - `./node_modules/.bin/tsx scripts/ingest/embed_exam_chunks.ts`  
     (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 필요)

## 스크립트 요약

| 스크립트 | 대상 테이블 |
|----------|-------------|
| `load_admission_db.ts` | `admission_records` |
| `embed_and_store.ts` | `guideline_chunks` |
| `load_neis_grades.ts` / `parse_neis_grades.ts` | `academic_records` |
| `load_student_record.ts` | `student_*` 생기부 테이블 |
| `embed_student_record.ts` | `student_record_chunks` |
| `embed_exam_chunks.ts` | `exam_chunks` |
