-- RAG: guideline_chunks 벡터 검색 + 채팅 일일 호출 한도

-- ---------------------------------------------------------------------------
-- 1) match_guideline_chunks — pgvector 코사인 거리, 선택적 메타 필터
-- ---------------------------------------------------------------------------
create or replace function public.match_guideline_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter_university text default null,
  filter_year int default null
)
returns table (
  id bigint,
  university_name text,
  admission_year integer,
  admission_type text,
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
    gc.university_name,
    gc.admission_year,
    gc.admission_type,
    gc.chunk_text,
    gc.metadata,
    (1 - (gc.embedding <=> query_embedding))::double precision as similarity
  from public.guideline_chunks gc
  where
    (filter_university is null or filter_university = ''
      or gc.university_name ilike '%' || filter_university || '%')
    and (filter_year is null or gc.admission_year = filter_year)
  order by gc.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

comment on function public.match_guideline_chunks(vector(1536), int, text, int) is
  '요강 RAG: 쿼리 임베딩과 가장 유사한 guideline_chunks 상위 N건 (선택 대학·연도 필터)';

grant execute on function public.match_guideline_chunks(vector(1536), int, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) chat_usage_daily — 사용자별 일일 채팅 호출 수
-- ---------------------------------------------------------------------------
create table if not exists public.chat_usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  call_count int not null default 0,
  primary key (user_id, usage_date)
);

create index if not exists idx_chat_usage_daily_usage_date on public.chat_usage_daily (usage_date);

comment on table public.chat_usage_daily is 'AI 챗봇(/api/chat) 일일 호출 횟수 (UTC 기준 일자)';

alter table public.chat_usage_daily enable row level security;

drop policy if exists chat_usage_daily_select_own on public.chat_usage_daily;
create policy chat_usage_daily_select_own on public.chat_usage_daily
  for select using (auth.uid() = user_id);

-- INSERT/UPDATE는 RPC(security definer)만 사용 — 직접 쓰기 정책 없음

-- ---------------------------------------------------------------------------
-- 3) try_consume_chat_quota — 원자적 한도 확인 + 1회 소비
-- ---------------------------------------------------------------------------
create or replace function public.try_consume_chat_quota(p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d date := (timezone('utc', now()))::date;
  cur int;
  lim int := greatest(1, least(coalesce(p_limit, 50), 10000));
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'used', 0, 'code', 'UNAUTHORIZED');
  end if;

  perform pg_advisory_xact_lock((hashtext(uid::text || '|' || d::text))::bigint);

  select c.call_count into cur
  from public.chat_usage_daily c
  where c.user_id = uid and c.usage_date = d
  for update;

  if not found then
    insert into public.chat_usage_daily (user_id, usage_date, call_count)
    values (uid, d, 1);
    return jsonb_build_object('ok', true, 'used', 1);
  end if;

  if cur >= lim then
    return jsonb_build_object('ok', false, 'used', cur, 'code', 'RATE_LIMIT');
  end if;

  update public.chat_usage_daily
  set call_count = call_count + 1
  where user_id = uid and usage_date = d
  returning call_count into cur;

  return jsonb_build_object('ok', true, 'used', cur);
end;
$$;

comment on function public.try_consume_chat_quota(int) is
  '채팅 일일 한도(UTC) 확인 후 허용 시 호출 횟수 1 증가';

grant execute on function public.try_consume_chat_quota(int) to authenticated;
