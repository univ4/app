-- NEIS(나이스) 내신 입력 확장: 학기, 과목 구분, 합계, 석차/전체인원
-- Path: supabase/migrations/20260329140000_academic_records_neis.sql

alter table public.academic_records
  add column if not exists semester text
    constraint academic_records_semester_values check (
      semester is null
      or semester in ('1-1', '1-2', '2-1', '2-2', '3-1', '3-2')
    );

alter table public.academic_records
  add column if not exists subject_category text
    constraint academic_records_subject_category_values check (
      subject_category is null
      or subject_category in ('general', 'career_choice', 'pe_art')
    );

alter table public.academic_records
  add column if not exists total_score numeric(6, 2);

alter table public.academic_records
  add column if not exists class_rank integer;

alter table public.academic_records
  add column if not exists rank_total integer;

-- 석차·전체인원은 둘 다 비어 있거나, 둘 다 있으면 1 <= 석차 <= 전체
alter table public.academic_records
  add constraint academic_records_rank_pair_check check (
    (class_rank is null and rank_total is null)
    or (
      class_rank is not null
      and rank_total is not null
      and class_rank >= 1
      and class_rank <= rank_total
    )
  );

create index if not exists idx_academic_records_semester on public.academic_records (semester)
  where record_type = 'SCHOOL_GPA';
