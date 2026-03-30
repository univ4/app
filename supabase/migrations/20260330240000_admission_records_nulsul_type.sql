-- P1-3: admission_records에 논술전형 허용 (실질 경쟁률·ingest 정합)

alter table public.admission_records
  drop constraint if exists admission_records_admission_type_check;

alter table public.admission_records
  add constraint admission_records_admission_type_check
  check (
    admission_type in (
      '학생부교과',
      '학생부종합',
      '논술전형',
      '정시'
    )
  );
