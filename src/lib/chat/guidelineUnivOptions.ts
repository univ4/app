/**
 * `guideline_chunks.metadata.univ_name` 필터용 — `scripts/ingest/embed_and_store.ts` 전형계획 18교.
 * (정시 총론·권역 자료 등은 대학명이 달라 별도 청크이며, 여기 목록은 전형계획 스코프용.)
 */
export const GUIDELINE_PLAN_UNIV_NAMES: readonly string[] = [
  "서울대",
  "연세대",
  "고려대",
  "성균관대",
  "한양대",
  "서강대",
  "중앙대",
  "경희대",
  "서울시립대",
  "건국대",
  "동국대",
  "홍익대",
  "아주대",
  "인하대",
  "세종대",
  "광운대",
  "국민대",
  "숭실대",
];

/** 매뉴얼 §12.1·§12.2 예시 질문 */
export const CHAT_EXAMPLE_QUESTIONS: readonly string[] = [
  "성균관대 학생부교과 추천인재 전형 수능최저가 뭐야?",
  "서강대 지역균형 전형 반영 교과가 뭐야?",
  "한양대 정시 수학 반영비율 알려줘",
  "건국대 KU자기추천 면접이 있어?",
  "과탐 가산점 있는 대학 다 알려줘",
] as const;
