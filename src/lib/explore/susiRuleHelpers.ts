/**
 * P1-16 — `susi_gpa_rules` 기반 수능최저·면접 필터 판정.
 * `interview_required`·`suneung_minimum`은 18개 대학 위주 적재; 미적재 행은 null/빈 값.
 */

export type SuneungMinQuery = "true" | "false" | "all";
export type NoInterviewQuery = "true" | "false" | "all";

/** JSON `suneung_minimum`에 실질적인 최저 조건이 있는지 */
export function jsonbIndicatesSuneungMinimum(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return false;
  const cond = o.condition;
  if (typeof cond === "string") {
    const t = cond.trim();
    if (t === "" || t === "없음" || t === "없음(해당없음)") return false;
    return true;
  }
  if (Array.isArray(o.subjects) && o.subjects.length > 0) return true;
  return keys.some((k) => k !== "note" && k !== "notes");
}

export function matchesSuneungMinFilter(
  admissionType: string,
  suneungMinimumJson: unknown | undefined,
  filter: SuneungMinQuery,
): boolean {
  if (filter === "all") return true;

  const hasMin =
    admissionType === "정시"
      ? false
      : jsonbIndicatesSuneungMinimum(suneungMinimumJson ?? null);

  if (filter === "true") {
    if (admissionType === "정시") return true;
    return !hasMin;
  }

  if (admissionType === "정시") return false;
  return hasMin;
}

export function matchesNoInterviewFilter(
  admissionType: string,
  interviewRequired: boolean | null | undefined,
  filter: NoInterviewQuery,
): boolean {
  if (filter === "all") return true;

  if (admissionType === "정시") {
    return filter === "true";
  }

  if (filter === "true") {
    return interviewRequired === false;
  }

  return interviewRequired === true;
}
