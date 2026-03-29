-- match_guideline_chunks: metadata jsonb @> filter + 코사인 유사도 하한, pgvector 거리 오름차순 정렬

drop function if exists public.match_guideline_chunks(vector(1536), int, text, int);
drop function if exists public.match_guideline_chunks(vector(1536), int, text, int, double precision);

create or replace function public.match_guideline_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb,
  match_threshold double precision default 0.75
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
    gc.id,
    gc.chunk_text,
    gc.metadata,
    (1 - (gc.embedding <=> query_embedding))::double precision as similarity
  from public.guideline_chunks gc
  where
    gc.metadata @> coalesce(filter, '{}'::jsonb)
    and (1 - (gc.embedding <=> query_embedding))
      >= coalesce(match_threshold, 0.75)
  order by gc.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

comment on function public.match_guideline_chunks(vector(1536), int, jsonb, double precision) is
  '요강 RAG: metadata @> filter, 코사인 유사도 하한 이상인 guideline_chunks 상위 N건 (거리 오름차순)';

grant execute on function public.match_guideline_chunks(vector(1536), int, jsonb, double precision) to authenticated;
