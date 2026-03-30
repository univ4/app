/** 모의고사 `subject_name` 규칙과 동일 — `parseSci2IsTypeTwo` 호환. */
export function buildScienceSubjectPipe(science1Name: string, science2Name: string): string {
  const s1 = science1Name.trim();
  const s2 = science2Name.trim();
  return `sci1:${s1}|sci2:${s2}`;
}
