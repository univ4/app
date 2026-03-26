/**
 * P1-11 선택과목 조합 (DB subject_profiles / 계산기 입력과 정렬)
 * 2027학년도 고정(year === 2027).
 */

export const SUBJECT_YEAR = 2027 as const;

export type KoreanSubjectChoice = "언어와매체" | "화법과작문";
export type MathSubjectChoice = "미적분" | "기하" | "확률과통계";

export interface SubjectProfile {
  student_id: string;
  year: typeof SUBJECT_YEAR;
  korean_subject: KoreanSubjectChoice;
  math_subject: MathSubjectChoice;
  science1: string | null;
  science2: string | null;
  social1: string | null;
  social2: string | null;
  second_foreign: string | null;
}

export interface UnivSubjectRequirement {
  id: string;
  univ_id: string;
  dept_id: string;
  year: typeof SUBJECT_YEAR;
  /** 필수 수학 과목(허용 목록). null/빈 배열이면 제한 없음 */
  required_math: string[] | null;
  /** 필수 탐구: 나열된 과목명이 학생 탐구 슬롯에 모두 포함되어야 함 */
  required_science: string[] | null;
  /** 우대 과목·가산(JSON). {@link parsePreferredSubjects} 참고 */
  preferred_subjects: Record<string, unknown> | null;
  /** 이 과목(명) 중 하나라도 선택 시 지원 불가 */
  disqualified_subjects: string[] | null;
  notes: string | null;
}

/** analyzeSubjectAdvantage 입력: 대학 식별자 + 표시명 + 요건 */
export interface University {
  id: string;
  name: string;
  requirement: UnivSubjectRequirement;
}
