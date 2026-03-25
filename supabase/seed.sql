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

