import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";
import type { UnivRegionBucket } from "@/lib/signals/univRegion";

import {
  matchesNoInterviewFilter,
  matchesSuneungMinFilter,
  type NoInterviewQuery,
  type SuneungMinQuery,
} from "./susiRuleHelpers";

export type ExploreRegionParam = "서울" | "수도권" | "지방" | "all";

export type ExploreFilterParams = {
  admissionTypes: string[] | null;
  signals: AdmissionSignalTier[] | null;
  region: ExploreRegionParam;
  suneungMin: SuneungMinQuery;
  noInterview: NoInterviewQuery;
};

function susiRuleKey(univ: string, admissionType: string) {
  return `${univ}\0${admissionType}`;
}

function regionMatches(rowRegion: UnivRegionBucket, region: ExploreRegionParam): boolean {
  if (region === "all") return true;
  if (region === "서울") return rowRegion === "seoul";
  if (region === "수도권") return rowRegion === "seoul" || rowRegion === "capital";
  if (region === "지방") return rowRegion === "provincial";
  return true;
}

export type SusiRuleLookupRow = {
  university_name: string;
  admission_type: string;
  suneung_minimum: unknown;
  interview_required: boolean | null;
};

export function buildSusiRuleMap(rows: SusiRuleLookupRow[]): Map<string, SusiRuleLookupRow> {
  const m = new Map<string, SusiRuleLookupRow>();
  for (const r of rows) {
    const k = susiRuleKey(r.university_name, r.admission_type);
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

export function applyExploreFilters(
  items: SignalScanRow[],
  ruleMap: Map<string, SusiRuleLookupRow>,
  params: ExploreFilterParams,
): SignalScanRow[] {
  return items.filter((row) => {
    if (params.admissionTypes && !params.admissionTypes.includes(row.admission_type)) {
      return false;
    }
    if (params.signals && !params.signals.includes(row.signal)) return false;
    if (!regionMatches(row.region, params.region)) return false;

    const rule = ruleMap.get(susiRuleKey(row.university_name, row.admission_type));
    const suneungJson =
      row.admission_type === "정시" ? undefined : (rule?.suneung_minimum ?? undefined);

    if (!matchesSuneungMinFilter(row.admission_type, suneungJson, params.suneungMin)) {
      return false;
    }

    const interviewReq =
      row.admission_type === "정시" ? null : (rule?.interview_required ?? null);

    if (!matchesNoInterviewFilter(row.admission_type, interviewReq, params.noInterview)) {
      return false;
    }

    return true;
  });
}

/** 쿼리 문자열 → 배열. "all"|빈 값 → null (필터 없음) */
export function parseListParam(
  raw: string | null,
  allowed: readonly string[],
): string[] | null {
  if (raw == null || raw === "" || raw === "all") return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const bad = parts.some((p) => !allowed.includes(p));
  if (bad) return null;
  return parts;
}

export function parseSignalListParam(raw: string | null): AdmissionSignalTier[] | null {
  const allowed = ["safe", "moderate", "challenge"] as const;
  return parseListParam(raw, allowed) as AdmissionSignalTier[] | null;
}

export function parseAdmissionTypeListParam(raw: string | null): string[] | null {
  const allowed = ["학생부교과", "학생부종합", "정시"] as const;
  return parseListParam(raw, [...allowed]);
}
