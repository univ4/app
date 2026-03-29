/**
 * 2027학년도 주요 입시 일정 — 사용자 매뉴얼 §13 화면 예시 기준.
 * 일부 마감·발표일은 대학별로 상이할 수 있음(주석 참고).
 */
export const ADMISSION_SCHEDULE_2027 = {
  /** 수시 원서접수 시작 (전형기간 통상 시작일) */
  susiApplicationStart: "2026-09-07",
  /** 대학수학능력시험 */
  suneung: "2026-11-12",
  /** 정시 원서접수 시작 */
  jeongsiApplicationStart: "2027-01-12",
  /** 최초 합격발표 (대학별 상이) */
  firstAdmissionResultApprox: "2027-02-01",
} as const;

export type AdmissionSchedule2027Key = keyof typeof ADMISSION_SCHEDULE_2027;
