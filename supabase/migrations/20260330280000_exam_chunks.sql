-- 논술/면접 기출 RAG 청크 (P2-4, docs/01_PRD_v2.md)
-- 적재 스크립트(틀): scripts/ingest/embed_exam_chunks.ts

-- ---------------------------------------------------------------------------
-- 1) exam_chunks
-- ---------------------------------------------------------------------------
create table public.exam_chunks (
  id bigint generated always as identity primary key,
  exam_type text not null check (exam_type in ('논술', '면접')),
  univ_name text not null,
  year int not null,
  dept_name text,
  chunk_text text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint exam_chunks_univ_year_type_chunk_unique
    unique (univ_name, year, exam_type, chunk_text)
);

create index if not exists exam_chunks_embedding_hnsw_idx
  on public.exam_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_exam_chunks_univ_year_type
  on public.exam_chunks (univ_name, year, exam_type);

comment on table public.exam_chunks is
  '논술·면접 기출 텍스트 RAG 청크; guideline_chunks·student_record_chunks와 분리';

comment on column public.exam_chunks.metadata is
  'JSON: source_file, page_section, citation_hint 등';

-- ---------------------------------------------------------------------------
-- 2) RLS — authenticated 읽기, admin 쓰기
-- ---------------------------------------------------------------------------
alter table public.exam_chunks enable row level security;

drop policy if exists exam_chunks_select_authenticated on public.exam_chunks;
create policy exam_chunks_select_authenticated on public.exam_chunks
  for select using (auth.role() = 'authenticated');

drop policy if exists exam_chunks_insert_admin on public.exam_chunks;
create policy exam_chunks_insert_admin on public.exam_chunks
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists exam_chunks_update_admin on public.exam_chunks;
create policy exam_chunks_update_admin on public.exam_chunks
  for update using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists exam_chunks_delete_admin on public.exam_chunks;
create policy exam_chunks_delete_admin on public.exam_chunks
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) match_exam_chunks — 기출 벡터 검색
-- ---------------------------------------------------------------------------
create or replace function public.match_exam_chunks(
  query_embedding vector(1536),
  exam_type_filter text,
  univ_name_filter text,
  match_count int default 5,
  match_threshold double precision default 0.6,
  year_filter int default null
)
returns table (
  id bigint,
  chunk_text text,
  metadata jsonb,
  similarity double precision,
  univ_name text,
  year int,
  exam_type text,
  dept_name text
)
language sql
stable
parallel safe
security invoker
set search_path = public
as $$
  select
    ec.id,
    ec.chunk_text,
    ec.metadata,
    (1 - (ec.embedding <=> query_embedding))::double precision as similarity,
    ec.univ_name,
    ec.year,
    ec.exam_type,
    ec.dept_name
  from public.exam_chunks ec
  where
    ec.exam_type = exam_type_filter
    and (univ_name_filter is null or trim(univ_name_filter) = '' or ec.univ_name = univ_name_filter)
    and (year_filter is null or ec.year = year_filter)
    and (1 - (ec.embedding <=> query_embedding))
      >= coalesce(match_threshold, 0.6)
  order by ec.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

comment on function public.match_exam_chunks(
  vector(1536), text, text, int, double precision, int
) is
  '기출 RAG: exam_type·선택 대학·선택 연도 필터, 코사인 유사도 하한 이상 상위 N건';

grant execute on function public.match_exam_chunks(
  vector(1536), text, text, int, double precision, int
) to authenticated;
