/** `POST /api/chat` SSE `done` 이벤트의 `citations[]` 항목 (서버 `CitationPayload`와 동일) */
export type ChatCitation = {
  university_name: string;
  admission_year: number;
  admission_type: string;
  chunk_id: number;
  citation_hint: string;
  page_section?: string;
};

export type ChatDonePayload = {
  finish_reason?: string;
  citations?: ChatCitation[];
};
