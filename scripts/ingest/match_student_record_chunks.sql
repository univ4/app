-- Supabase SQL Editor용: 생기부 RAG 벡터 검색 RPC
-- 선행: 마이그레이션 `20260330250000_student_record_chunks.sql` 적용 후 실행
-- (테이블·RLS가 이미 있으면 아래 함수만 실행해도 됨)

create or replace function public.match_student_record_chunks(
  query_embedding vector(1536),
  student_id_filter uuid,
  match_count int default 5,
  match_threshold double precision default 0.6
)
returns table (
  id bigint,
  chunk_text text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
parallel safe
security invoker
set search_path = public
as $$
  select
    src.id,
    src.chunk_text,
    src.metadata,
    (1 - (src.embedding <=> query_embedding))::double precision as similarity
  from public.student_record_chunks src
  where
    student_id_filter is not null
    and src.student_id = student_id_filter
    and (1 - (src.embedding <=> query_embedding))
      >= coalesce(match_threshold, 0.6)
  order by src.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

comment on function public.match_student_record_chunks(vector(1536), uuid, int, double precision) is
  '생기부 RAG: 지정 학생의 student_record_chunks 중 코사인 유사도 하한 이상 상위 N건';

grant execute on function public.match_student_record_chunks(vector(1536), uuid, int, double precision)
  to authenticated;
