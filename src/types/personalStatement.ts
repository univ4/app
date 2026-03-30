/**
 * P1-6 자소서 코치 — 피드백 SSE `done` 페이로드 및 역량 섹션
 */

export type PersonalStatementSectionKey =
  | "char_count"
  | "academic"
  | "career"
  | "community"
  | "suggestions";

export type PersonalStatementSection = {
  key: PersonalStatementSectionKey;
  title: string;
  content: string;
};

export type PersonalStatementFeedbackDonePayload = {
  finish_reason: "stop" | "no_context";
  sections: PersonalStatementSection[];
};

export type PersonalStatementRow = {
  id: string;
  student_id: string;
  university: string;
  question_number: number;
  question_text: string;
  draft_text: string;
  max_length: number;
  created_at: string;
  updated_at: string;
};
