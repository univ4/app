/** MOCK_EXAM `subject_name`에 저장된 sci2 접미사로 과탐II 여부 추정 (`/api/analysis/probability`와 동일). */
export function parseSci2IsTypeTwo(subjectName: string | null): boolean {
  if (!subjectName) return false;
  const parts = subjectName.split("|").map((s) => s.trim());
  const sci2Part = parts.find((p) => p.startsWith("sci2:"));
  const sci2Subject = (sci2Part?.slice("sci2:".length) ?? "").trim();
  if (!sci2Subject) return false;
  return sci2Subject.includes("II");
}
