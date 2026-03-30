-- P1-16: 면접 유무 필터용 플래그 (18개 대학 요강 연동 시 채움; null = 미상)

alter table public.susi_gpa_rules
  add column if not exists interview_required boolean;

comment on column public.susi_gpa_rules.interview_required is
  '전형 면접 필수 여부. null이면 미상(탐색기 필터에서 엄격 모드 시 제외 가능)';
