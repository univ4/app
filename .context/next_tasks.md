# Next Tasks — Week 3 (우선순위 순서)

1. **`supabase/migrations/[timestamp]_subject_profiles.sql` 생성 및 적용**  
   - `subject_profiles` / 학과별 선택과목 요건 등 Week 3 스키마를 마이그레이션으로 고정하고 로컬·원격 반영.

2. **2027학년도 입시 일정 시드 데이터 작성**  
   - 예: 수시 원서접수 **2026-09-07** 등 `admission_schedules`(또는 동등 테이블)에 반영 가능한 형태로 시드 정리.

3. **`calcDDay()` 함수 구현 + 테스트**  
   - Track 1 순수 함수, `src/lib/calculators/` + `src/__tests__/calculators/` AC·엣지 케이스 포함.

4. **`calcSuneungMinimumProbability()` 함수 구현 + 테스트**  
   - 모의고사 분포·`susi_gpa_rules.suneung_minimum` 등과 연동 가능한 입력/출력 설계 후 계산기 + 단위 테스트.

5. **PDF 파싱 스크립트**  
   - OpenDataLoader 등 활용, `scripts/ingest/` 아래에서 모집요강 PDF → 구조화 텍스트/중간 산출물.

6. **청킹 + 임베딩 적재 스크립트 (pgvector)**  
   - `guideline_chunks` 등에 청크·메타데이터·벡터 컬럼 적재 파이프라인.

7. **pgvector 유사도 검색 함수**  
   - top-k, `university` / `admission_type` / `year` / 카테고리 필터 등 메타 조건 반영.

8. **Claude Tool Use 챗봇 API**  
   - `src/app/api/chat/route.ts`: 검색·프롬프트·Track 1 도구 브리지.

9. **챗봇 UI 컴포넌트**  
   - 메시지 영역, 로딩/오류, 출처 표시, (필요 시) 스트리밍·필터 UI.
