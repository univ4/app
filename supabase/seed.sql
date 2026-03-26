-- Seed data for univ project
-- Path: supabase/seed.sql
-- NOTE: 아래 수치는 2026학년도 실제 요강 기준으로 재검증이 필요합니다.

insert into public.university_scoring_rules (
  university_name, major_group, admission_year,
  korean_ratio, math_ratio, english_ratio, science_ratio,
  science_2_bonus, english_conversion_table
) values
  (
    '서강대', '자연계열', 2026,
    0.25, 0.35, 0.15, 0.25,
    0.03,
    '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb
  ),
  (
    '성균관대', '자연계열', 2026,
    0.20, 0.35, 0.15, 0.30,
    0.03,
    '{"1": 100, "2": 97, "3": 92, "4": 84, "5": 74}'::jsonb
  ),
  (
    '한양대', '자연계열', 2026,
    0.20, 0.35, 0.15, 0.30,
    0.03,
    '{"1": 100, "2": 96, "3": 91, "4": 83, "5": 73}'::jsonb
  )
on conflict (university_name, major_group, admission_year) do update
set
  korean_ratio = excluded.korean_ratio,
  math_ratio = excluded.math_ratio,
  english_ratio = excluded.english_ratio,
  science_ratio = excluded.science_ratio,
  science_2_bonus = excluded.science_2_bonus,
  english_conversion_table = excluded.english_conversion_table;

-- TODO: 요강 확인 필요 - 대학별 학생부교과 반영 교과/진로선택 환산/수능최저
insert into public.susi_gpa_rules (
  university_name, admission_type, admission_year,
  include_subjects, career_choice_conversion, suneung_minimum
) values
  (
    '서강대', '학생부교과', 2026,
    array['국어', '수학', '영어', '과학'],
    '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb,
    '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb
  ),
  (
    '성균관대', '학생부교과', 2026,
    array['국어', '수학', '영어', '과학'],
    '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb,
    '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb
  ),
  (
    '한양대', '학생부교과', 2026,
    array['국어', '수학', '영어', '과학'],
    '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb,
    '{"condition": "3개합7", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb
  )
on conflict (university_name, admission_type, admission_year) do update
set
  include_subjects = excluded.include_subjects,
  career_choice_conversion = excluded.career_choice_conversion,
  suneung_minimum = excluded.suneung_minimum;

-- =========================================================
-- 확장 시드: SKY / 중경외시건 / 의예·수의예 (정시 반영 규칙)
-- NOTE: 2026 요강 기준 재검증 필요
-- =========================================================
-- TODO: 요강 확인 필요 - 대학/모집단위별 반영비율 및 영어 환산표 확정
insert into public.university_scoring_rules (
  university_name, major_group, admission_year,
  korean_ratio, math_ratio, english_ratio, science_ratio,
  science_2_bonus, english_conversion_table
) values
  -- SKY 자연계열
  ('서울대', '자연계열', 2026, 0.30, 0.40, 0.10, 0.20, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 84, "5": 74}'::jsonb),
  ('연세대', '자연계열', 2026, 0.25, 0.35, 0.15, 0.25, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 84, "5": 74}'::jsonb),
  ('고려대', '자연계열', 2026, 0.25, 0.35, 0.15, 0.25, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 84, "5": 74}'::jsonb),

  -- 중경외시건 자연계열
  ('중앙대', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 83, "5": 73}'::jsonb),
  ('경희대', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 83, "5": 73}'::jsonb),
  ('시립대', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 83, "5": 73}'::jsonb),
  ('건국대', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 83, "5": 73}'::jsonb),

  -- 의예·수의예
  ('성균관대', '의예과', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 94, "4": 86, "5": 76}'::jsonb),
  ('한양대', '의예과', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 94, "4": 86, "5": 76}'::jsonb),
  ('중앙대', '의예과', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 94, "4": 86, "5": 76}'::jsonb),
  ('경희대', '의예과', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 94, "4": 86, "5": 76}'::jsonb),
  ('건국대', '수의예과', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 94, "4": 86, "5": 76}'::jsonb)
on conflict (university_name, major_group, admission_year) do update
set
  korean_ratio = excluded.korean_ratio,
  math_ratio = excluded.math_ratio,
  english_ratio = excluded.english_ratio,
  science_ratio = excluded.science_ratio,
  science_2_bonus = excluded.science_2_bonus,
  english_conversion_table = excluded.english_conversion_table;

-- =========================================================
-- 확장 시드: 학생부교과 반영 규칙
-- NOTE: 교과전형이 없는 대학(예: 서울대)은 INSERT 생략
-- =========================================================
-- TODO: 요강 확인 필요 - 연세대/고려대/시립대 교과전형 실운영 여부 및 최저 기준
insert into public.susi_gpa_rules (
  university_name, admission_type, admission_year,
  include_subjects, career_choice_conversion, suneung_minimum
) values
  ('연세대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.5, "C": 9.0}'::jsonb, '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('고려대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.5, "C": 9.0}'::jsonb, '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('중앙대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('경희대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "3개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('시립대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합4", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('건국대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb)
on conflict (university_name, admission_type, admission_year) do update
set
  include_subjects = excluded.include_subjects,
  career_choice_conversion = excluded.career_choice_conversion,
  suneung_minimum = excluded.suneung_minimum;

-- =========================================================
-- 특성화 대학(과기원): 정시 없음, 수시 학종 100% 중심
-- - university_scoring_rules INSERT 생략
-- - admission_schedules에 수시 원서접수 일정만 추가
-- =========================================================
-- TODO: 요강 확인 필요 - KAIST/POSTECH/UNIST/DGIST/GIST 2026 수시 원서접수 정확 날짜
insert into public.admission_schedules (
  university_name, event_name, event_type, event_date, description
)
select * from (
  values
    ('KAIST', '수시 원서접수', '수시', '2025-09-10T09:00:00+09:00'::timestamptz, '학종 중심 선발 (정시 없음)'),
    ('POSTECH', '수시 원서접수', '수시', '2025-09-11T09:00:00+09:00'::timestamptz, '학종 중심 선발 (정시 없음)'),
    ('UNIST', '수시 원서접수', '수시', '2025-09-12T09:00:00+09:00'::timestamptz, '학종 중심 선발 (정시 없음)'),
    ('DGIST', '수시 원서접수', '수시', '2025-09-12T09:00:00+09:00'::timestamptz, '학종 중심 선발 (정시 없음)'),
    ('GIST', '수시 원서접수', '수시', '2025-09-13T09:00:00+09:00'::timestamptz, '학종 중심 선발 (정시 없음)')
) as v(university_name, event_name, event_type, event_date, description)
where not exists (
  select 1
  from public.admission_schedules s
  where s.university_name = v.university_name
    and s.event_name = v.event_name
    and s.event_date = v.event_date
);

-- =========================================================
-- 확장 시드: 인서울/수도권/지방거점 이공계 (2026 자연계열)
-- =========================================================
-- TODO: 요강 확인 필요 - 대학별 정시 반영 비율/영어 환산표/과탐II 가산점 최종 확정
insert into public.university_scoring_rules (
  university_name, major_group, admission_year,
  korean_ratio, math_ratio, english_ratio, science_ratio,
  science_2_bonus, english_conversion_table
) values
  -- 인서울 이공계
  ('숭실대', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('세종대', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('국민대', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('광운대', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('동국대', '자연계열', 2026, 0.20, 0.36, 0.14, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('홍익대', '자연계열', 2026, 0.20, 0.36, 0.14, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('단국대(죽전)', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 84, "5": 75}'::jsonb),

  -- 수도권 이공계
  ('아주대', '자연계열', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 93, "4": 86, "5": 77}'::jsonb),
  ('인하대', '자연계열', 2026, 0.20, 0.40, 0.10, 0.30, 0.03, '{"1": 100, "2": 98, "3": 93, "4": 86, "5": 77}'::jsonb),
  ('한국항공대', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),
  ('가천대', '자연계열', 2026, 0.20, 0.35, 0.15, 0.30, 0.03, '{"1": 100, "2": 96, "3": 91, "4": 84, "5": 75}'::jsonb),
  ('한양대ERICA', '자연계열', 2026, 0.20, 0.38, 0.12, 0.30, 0.03, '{"1": 100, "2": 97, "3": 92, "4": 85, "5": 76}'::jsonb),

  -- 지방 거점 국립대
  ('부산대', '자연계열', 2026, 0.25, 0.35, 0.15, 0.25, 0.03, '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb),
  ('경북대', '자연계열', 2026, 0.25, 0.35, 0.15, 0.25, 0.03, '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb),
  ('전남대', '자연계열', 2026, 0.25, 0.33, 0.15, 0.27, 0.03, '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb),
  ('충남대', '자연계열', 2026, 0.25, 0.33, 0.15, 0.27, 0.03, '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb),
  ('전북대', '자연계열', 2026, 0.25, 0.33, 0.15, 0.27, 0.03, '{"1": 100, "2": 96, "3": 90, "4": 82, "5": 72}'::jsonb)
on conflict (university_name, major_group, admission_year) do update
set
  korean_ratio = excluded.korean_ratio,
  math_ratio = excluded.math_ratio,
  english_ratio = excluded.english_ratio,
  science_ratio = excluded.science_ratio,
  science_2_bonus = excluded.science_2_bonus,
  english_conversion_table = excluded.english_conversion_table;

-- TODO: 요강 확인 필요 - 대학별 교과전형 반영과목/성취도 환산/수능최저 정확 기준
insert into public.susi_gpa_rules (
  university_name, admission_type, admission_year,
  include_subjects, career_choice_conversion, suneung_minimum
) values
  -- 인서울 이공계
  ('숭실대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('세종대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('국민대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('광운대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('동국대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('홍익대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('단국대(죽전)', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),

  -- 수도권 이공계
  ('아주대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.50, "C": 9.00}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('인하대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.50, "C": 9.00}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('한국항공대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('가천대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.43, "C": 8.86}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('한양대ERICA', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.45, "C": 8.90}'::jsonb, '{"condition": "2개합5", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),

  -- 지방 거점 국립대
  ('부산대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.40, "C": 8.80}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('경북대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.40, "C": 8.80}'::jsonb, '{"condition": "2개합6", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('전남대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.35, "C": 8.70}'::jsonb, '{"condition": "2개합7", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('충남대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.35, "C": 8.70}'::jsonb, '{"condition": "2개합7", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb),
  ('전북대', '학생부교과', 2026, array['국어', '수학', '영어', '과학'], '{"A": 10, "B": 9.35, "C": 8.70}'::jsonb, '{"condition": "2개합7", "subjects": ["korean", "math", "english", "sci1"]}'::jsonb)
on conflict (university_name, admission_type, admission_year) do update
set
  include_subjects = excluded.include_subjects,
  career_choice_conversion = excluded.career_choice_conversion,
  suneung_minimum = excluded.suneung_minimum;

-- =========================================================
-- 확장 시드: 원서접수 일정 (2026학년도)
-- =========================================================
-- TODO: 요강 확인 필요 - 대학별 수시/정시 원서접수 실제 시작/마감 시각
insert into public.admission_schedules (
  university_name, event_name, event_type, event_date, description
)
select * from (
  values
    -- 인서울 이공계
    ('숭실대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('숭실대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('숭실대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('세종대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('세종대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('세종대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('국민대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('국민대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('국민대', '정시 원서접수', '정시', '2025-12-31T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('광운대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('광운대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('광운대', '정시 원서접수', '정시', '2025-12-31T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('동국대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('동국대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('동국대', '정시 원서접수', '정시', '2025-12-31T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('홍익대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('홍익대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('홍익대', '정시 원서접수', '정시', '2025-12-31T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('단국대(죽전)', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('단국대(죽전)', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('단국대(죽전)', '정시 원서접수', '정시', '2026-01-02T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),

    -- 수도권 이공계
    ('아주대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('아주대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('아주대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('인하대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('인하대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('인하대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('한국항공대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('한국항공대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('한국항공대', '정시 원서접수', '정시', '2026-01-02T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('가천대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('가천대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('가천대', '정시 원서접수', '정시', '2026-01-02T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('한양대ERICA', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('한양대ERICA', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('한양대ERICA', '정시 원서접수', '정시', '2026-01-02T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),

    -- 지방 거점 국립대
    ('부산대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('부산대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('부산대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('경북대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('경북대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('경북대', '정시 원서접수', '정시', '2025-12-30T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('전남대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('전남대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('전남대', '정시 원서접수', '정시', '2026-01-03T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('충남대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('충남대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('충남대', '정시 원서접수', '정시', '2026-01-03T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)'),
    ('전북대', '수시 원서접수 시작', '수시', '2025-09-08T09:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('전북대', '수시 원서접수 마감', '수시', '2025-09-12T18:00:00+09:00'::timestamptz, '2026학년도 수시 원서접수'),
    ('전북대', '정시 원서접수', '정시', '2026-01-03T10:00:00+09:00'::timestamptz, '2026학년도 정시 원서접수 (12월 말~1월 초)')
) as v(university_name, event_name, event_type, event_date, description)
where not exists (
  select 1
  from public.admission_schedules s
  where s.university_name = v.university_name
    and s.event_name = v.event_name
    and s.event_date = v.event_date
);

