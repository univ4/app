-- 생활기록부 RAG 청크 (docs/08_STUDENT_RECORD_SPEC.md RAG 적재, PRD v2 §11.3)
-- 스크립트: scripts/ingest/embed_student_record.ts

-- ---------------------------------------------------------------------------
-- 1) student_record_chunks
-- ---------------------------------------------------------------------------
create table public.student_record_chunks (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  content_sha256 text not null,
  created_at timestamptz not null default now(),
  constraint student_record_chunks_content_sha256_len check (char_length(content_sha256) = 64),
  constraint student_record_chunks_student_content_unique unique (student_id, content_sha256)
);

create index if not exists student_record_chunks_embedding_hnsw_idx
  on public.student_record_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_student_record_chunks_student_id
  on public.student_record_chunks (student_id);

comment on table public.student_record_chunks is
  'NEIS 생활기록부 RAG 청크 (세특·창체·행동특성); guideline_chunks와 분리';

comment on column public.student_record_chunks.content_sha256 is
  '청크 본문 SHA-256(hex); metadata.content_sha256과 동일 값 유지';

-- ---------------------------------------------------------------------------
-- 2) RLS — 생활기록부 구조화 테이블과 동일 패턴
-- ---------------------------------------------------------------------------
alter table public.student_record_chunks enable row level security;

drop policy if exists student_record_chunks_select on public.student_record_chunks;
create policy student_record_chunks_select on public.student_record_chunks
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_record_chunks_insert_admin on public.student_record_chunks;
create policy student_record_chunks_insert_admin on public.student_record_chunks
  for insert with check (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

drop policy if exists student_record_chunks_update_admin on public.student_record_chunks;
create policy student_record_chunks_update_admin on public.student_record_chunks
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

drop policy if exists student_record_chunks_delete_admin on public.student_record_chunks;
create policy student_record_chunks_delete_admin on public.student_record_chunks
  for delete using (
    exists (
      select 1 from public.students s
      where s.id = auth.uid() and s.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) match_student_record_chunks — 학생 스코프 벡터 검색
-- ---------------------------------------------------------------------------
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
