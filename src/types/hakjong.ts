/** `POST /api/student-record/analyze` SSE `done` 이벤트의 `sections[]` */
export type HakjongSectionKey = "academic" | "career" | "community";

export type HakjongSection = {
  key: HakjongSectionKey;
  title: string;
  content: string;
};

export type HakjongAnalyzeDonePayload = {
  finish_reason?: string;
  sections?: HakjongSection[];
};
