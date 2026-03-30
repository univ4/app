import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";
import {
  calculateSuneungScore,
  type SuneungScores,
  type UniversityScoringRules,
} from "@/lib/calculators/calculateSuneungScore";
import {
  calculateSusiGPA,
  type AcademicRecord as SusiAcademicRecord,
  type SusiGpaRules,
} from "@/lib/calculators/calculateSusiGPA";

import { classifyUnivRegion, type UnivRegionBucket } from "./univRegion";

export type DbAdmissionRecord = {
  id: number;
  univ_name: string;
  dept_name: string;
  admission_type: string;
  year: number;
  cutoff_score: number | null;
  med_shift_coeff: number | null;
};

export type SignalScanRow = {
  id: number;
  university_name: string;
  admission_name: string;
  admission_type: string;
  track: string;
  region: UnivRegionBucket;
  cutoff: number;
  adjusted_cutoff: number;
  my_score: number;
  signal: "safe" | "moderate" | "challenge";
  probability: number;
  probability_percent: number;
  gap: number;
  med_shift_applied: boolean;
};

type ScoringRulesRow = UniversityScoringRules & {
  university_name: string;
  major_group: string;
};

type SusiRulesRow = {
  university_name: string;
  admission_type: string;
  include_subjects: string[];
  career_choice_conversion: Record<string, number>;
};

type GpaDbRow = {
  subject_name: string | null;
  credit_unit: number | null;
  school_grade: number | null;
  achievement_level: string | null;
};

function normalizeUnivName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/대학교$/u, "대");
}

function normalizeMajorGroup(group: string): "자연계열" | "인문계열" | null {
  const g = group.trim();
  if (/자연/u.test(g)) return "자연계열";
  if (/인문/u.test(g)) return "인문계열";
  return null;
}

function inferMajorGroupFromDeptName(deptName: string): "자연계열" | "인문계열" | null {
  const track = inferTrack(deptName);
  if (track === "자연") return "자연계열";
  if (track === "인문") return "인문계열";
  return null;
}

function scoringKey(univ: string, majorGroup: "자연계열" | "인문계열") {
  return `${normalizeUnivName(univ)}\0${majorGroup}`;
}

function firstMapByUnivAndGroup<T extends { university_name: string; major_group: string }>(
  rows: T[],
): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) {
    const majorGroup = normalizeMajorGroup(r.major_group);
    if (!majorGroup) continue;
    const key = scoringKey(r.university_name, majorGroup);
    if (!m.has(key)) m.set(key, r);
  }
  return m;
}

function susiKey(univ: string, admissionType: string) {
  return `${normalizeUnivName(univ)}\0${admissionType.trim()}`;
}

function firstMapSusi(rows: SusiRulesRow[]): Map<string, SusiRulesRow> {
  const m = new Map<string, SusiRulesRow>();
  for (const r of rows) {
    const k = susiKey(r.university_name, r.admission_type);
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

function fallbackWeightedGpa(records: GpaDbRow[]): number | null {
  let w = 0;
  let sum = 0;
  for (const r of records) {
    if (r.school_grade == null || r.credit_unit == null || r.credit_unit <= 0) continue;
    sum += r.school_grade * r.credit_unit;
    w += r.credit_unit;
  }
  if (w <= 0) return null;
  return Number((sum / w).toFixed(2));
}

function toSusiRecords(rows: GpaDbRow[]): SusiAcademicRecord[] {
  return rows.map((r) => ({
    subject_name: r.subject_name,
    credit_unit: r.credit_unit,
    school_grade: r.school_grade,
    achievement_level:
      r.achievement_level === "A" ||
      r.achievement_level === "B" ||
      r.achievement_level === "C" ||
      r.achievement_level === "D" ||
      r.achievement_level === "E"
        ? r.achievement_level
        : null,
  }));
}

function inferTrack(deptName: string): string {
  const d = deptName.trim();
  if (/자연|공학|이공|의예|약학|수의/u.test(d)) return "자연";
  if (/인문|어문|사회|경영|법학|상경/u.test(d)) return "인문";
  return "—";
}

export type BuildAdmissionSignalRowsInput = {
  admissionRows: DbAdmissionRecord[];
  scoringRules: ScoringRulesRow[];
  susiRules: SusiRulesRow[];
  schoolGpaRows: GpaDbRow[];
  suneungScores: SuneungScores | null;
  applyMedShift: boolean;
};

export function buildAdmissionSignalRows(input: BuildAdmissionSignalRowsInput): SignalScanRow[] {
  const { admissionRows, scoringRules, susiRules, schoolGpaRows, suneungScores, applyMedShift } =
    input;

  const rulesByUnivAndGroup = firstMapByUnivAndGroup(scoringRules);
  const susiByKey = firstMapSusi(susiRules);
  const susiRecords = toSusiRecords(schoolGpaRows);

  const suneungCache = new Map<string, number>();
  const gpaCache = new Map<string, number>();

  const resolveSuneung = (univ: string, deptName: string): number | null => {
    if (!suneungScores) return null;
    const inferredGroup = inferMajorGroupFromDeptName(deptName);
    const key = inferredGroup ? scoringKey(univ, inferredGroup) : normalizeUnivName(univ);
    const cacheKey = key;
    if (suneungCache.has(cacheKey)) return suneungCache.get(cacheKey)!;

    const primary = inferredGroup ? rulesByUnivAndGroup.get(scoringKey(univ, inferredGroup)) : undefined;
    const fallbackMajorGroup = inferredGroup === "자연계열" ? "인문계열" : "자연계열";
    const fallback =
      inferredGroup != null ? rulesByUnivAndGroup.get(scoringKey(univ, fallbackMajorGroup)) : undefined;
    const row = primary ?? fallback;
    if (!row) return null;
    const rules: UniversityScoringRules = {
      korean_ratio: Number(row.korean_ratio),
      math_ratio: Number(row.math_ratio),
      english_ratio: Number(row.english_ratio),
      science_ratio: Number(row.science_ratio),
      science_2_bonus: Number(row.science_2_bonus),
      english_conversion_table: row.english_conversion_table as Record<string, number>,
    };
    try {
      const v = calculateSuneungScore(suneungScores, rules);
      if (v == null) return null;
      suneungCache.set(cacheKey, v);
      return v;
    } catch {
      return null;
    }
  };

  const resolveGpa = (univ: string, admissionType: string): number | null => {
    const k = susiKey(univ, admissionType);
    if (gpaCache.has(k)) return gpaCache.get(k)!;
    const ruleRow = susiByKey.get(k);
    let v: number | null = null;
    if (ruleRow) {
      const rules: SusiGpaRules = {
        include_subjects: ruleRow.include_subjects,
        career_choice_conversion: ruleRow.career_choice_conversion,
      };
      try {
        v = calculateSusiGPA(susiRecords, rules);
      } catch {
        v = null;
      }
    }
    if (v == null) {
      v = fallbackWeightedGpa(schoolGpaRows);
    }
    if (v != null) gpaCache.set(k, v);
    return v;
  };

  const out: SignalScanRow[] = [];

  for (const ar of admissionRows) {
    const cutoff = ar.cutoff_score;
    if (cutoff == null || !Number.isFinite(Number(cutoff))) continue;

    const cutoffN = Number(cutoff);
    const med = applyMedShift && ar.med_shift_coeff != null && Number.isFinite(Number(ar.med_shift_coeff))
      ? Number(ar.med_shift_coeff)
      : 0;

    let myScore: number | null = null;
    let scoreType: "suneung" | "gpa";

    const admissionType = ar.admission_type.trim();

    if (admissionType === "정시") {
      scoreType = "suneung";
      myScore = resolveSuneung(ar.univ_name, ar.dept_name);
    } else if (admissionType === "학생부교과" || admissionType === "학생부종합") {
      scoreType = "gpa";
      myScore = resolveGpa(ar.univ_name, admissionType);
    } else {
      continue;
    }

    if (myScore == null || !Number.isFinite(myScore)) {
      continue;
    }

    const { signal, probability, gap } = calcAdmissionSignal({
      myScore,
      cutoff: cutoffN,
      scoreType,
      medShiftCoeff: med,
    });

    const adjusted_cutoff = Number((cutoffN + med).toFixed(4));

    out.push({
      id: ar.id,
      university_name: ar.univ_name.trim(),
      admission_name: ar.dept_name,
      admission_type: admissionType,
      track: inferTrack(ar.dept_name),
      region: classifyUnivRegion(ar.univ_name.trim()),
      cutoff: cutoffN,
      adjusted_cutoff,
      my_score: myScore,
      signal,
      probability,
      probability_percent: Math.round(probability * 1000) / 10,
      gap,
      med_shift_applied: med !== 0,
    });
  }

  return out;
}
