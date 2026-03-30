import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  calcGachaejeomScore,
  type CalcGachaejeomScoreParams,
} from "@/lib/calculators/calcGachaejeomScore";
import { calculateSuneungScore, type SuneungScores } from "@/lib/calculators/calculateSuneungScore";
import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";
import { BROCHURE_EIGHTEEN_UNIVERSITY_NAMES } from "@/lib/gachaejeom/brochureEighteenUniversities";
import { buildScienceSubjectPipe } from "@/lib/gachaejeom/buildScienceSubjectPipe";
import type { GachaejeomUnivResult } from "@/lib/gachaejeom/gachaejeomApiTypes";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  korean: z.object({
    rawScore: z.coerce.number(),
    subject: z.string().min(1),
  }),
  math: z.object({
    rawScore: z.coerce.number(),
    subject: z.string().min(1),
  }),
  english: z.object({
    grade: z.coerce.number().int().min(1).max(9),
  }),
  science1: z.object({
    rawScore: z.coerce.number(),
    subjectName: z.string().min(1),
  }),
  science2: z.object({
    rawScore: z.coerce.number(),
    subjectName: z.string().min(1),
  }),
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
  medShift: z.boolean().optional(),
});

type ScoringRuleRow = {
  university_name: string;
  major_group: string;
  korean_ratio: number;
  math_ratio: number;
  english_ratio: number;
  science_ratio: number;
  science_2_bonus: number;
  english_conversion_table: Record<string, number>;
};

type AdmissionJeongsiRow = {
  id: number;
  univ_name: string;
  dept_name: string;
  cutoff_score: number | null;
  med_shift_coeff: number | null;
};

function firstJeongsiByUniv(rows: AdmissionJeongsiRow[]): Map<string, AdmissionJeongsiRow> {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const m = new Map<string, AdmissionJeongsiRow>();
  for (const r of sorted) {
    if (!m.has(r.univ_name)) m.set(r.univ_name, r);
  }
  return m;
}

function assertEnglishGradeInAllRules(grade: number, rules: ScoringRuleRow[]): string | null {
  const key = String(grade);
  for (const r of rules) {
    const t = r.english_conversion_table;
    if (t == null || typeof t !== "object" || !Number.isFinite(Number(t[key]))) {
      return r.university_name;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const started = performance.now();
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "입력값을 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const admissionYear = parsed.data.admissionYear ?? 2026;
  const applyMedShift = parsed.data.medShift === true;

  const params: CalcGachaejeomScoreParams = {
    korean: parsed.data.korean,
    math: parsed.data.math,
    english: parsed.data.english,
    science1: parsed.data.science1,
    science2: parsed.data.science2,
  };

  let gachae: ReturnType<typeof calcGachaejeomScore>;
  try {
    gachae = calcGachaejeomScore(params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const isVal = msg.startsWith("ValidationError:");
    return NextResponse.json(
      {
        data: null,
        error: {
          code: isVal ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
          message: isVal ? msg.replace(/^ValidationError:\s*/u, "") : msg,
        },
      },
      { status: isVal ? 422 : 500 },
    );
  }

  const sciencePipe = buildScienceSubjectPipe(
    parsed.data.science1.subjectName,
    parsed.data.science2.subjectName,
  );
  const sci2IsTypeTwo = parseSci2IsTypeTwo(sciencePipe);

  const suneungScores: SuneungScores = {
    korean_standard_score: gachae.estimatedScores.korean.standardScore,
    math_standard_score: gachae.estimatedScores.math.standardScore,
    english_grade: parsed.data.english.grade,
    sci1_standard_score: gachae.estimatedScores.science1.standardScore,
    sci2_standard_score: gachae.estimatedScores.science2.standardScore,
    sci2_is_type_two: sci2IsTypeTwo,
  };

  const [
    { data: scoringRows, error: scoreErr },
    { data: admissionRows, error: admErr },
  ] = await Promise.all([
    supabase
      .from("university_scoring_rules")
      .select(
        "university_name, major_group, korean_ratio, math_ratio, english_ratio, science_ratio, science_2_bonus, english_conversion_table",
      )
      .eq("admission_year", admissionYear)
      .eq("major_group", "자연계열")
      .in("university_name", [...BROCHURE_EIGHTEEN_UNIVERSITY_NAMES]),
    supabase
      .from("admission_records")
      .select("id, univ_name, dept_name, cutoff_score, med_shift_coeff")
      .eq("year", admissionYear)
      .eq("admission_type", "정시")
      .in("univ_name", [...BROCHURE_EIGHTEEN_UNIVERSITY_NAMES])
      .not("cutoff_score", "is", null),
  ]);

  if (scoreErr || admErr) {
    const msg = scoreErr?.message ?? admErr?.message ?? "unknown";
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }

  const rules = (scoringRows ?? []) as ScoringRuleRow[];
  const rulesByUniv = new Map<string, ScoringRuleRow>();
  for (const r of rules) {
    if (!rulesByUniv.has(r.university_name)) rulesByUniv.set(r.university_name, r);
  }

  const missingEnglishUniv = assertEnglishGradeInAllRules(parsed.data.english.grade, rules);
  if (missingEnglishUniv != null) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: `영어 등급 ${parsed.data.english.grade}에 대한 환산표가 없는 대학이 있습니다 (${missingEnglishUniv}). 시드 기준으로는 1~5등급을 입력해 주세요.`,
        },
      },
      { status: 422 },
    );
  }

  const jeongsiByUniv = firstJeongsiByUniv((admissionRows ?? []) as AdmissionJeongsiRow[]);

  const univResults: GachaejeomUnivResult[] = [];

  for (const university_name of BROCHURE_EIGHTEEN_UNIVERSITY_NAMES) {
    const ruleRow = rulesByUniv.get(university_name);
    const adm = jeongsiByUniv.get(university_name);
    if (!ruleRow || !adm) continue;

    const cutoff = Number(adm.cutoff_score);
    if (!Number.isFinite(cutoff)) continue;

    let converted_score: number;
    try {
      converted_score = calculateSuneungScore(suneungScores, {
        korean_ratio: Number(ruleRow.korean_ratio),
        math_ratio: Number(ruleRow.math_ratio),
        english_ratio: Number(ruleRow.english_ratio),
        science_ratio: Number(ruleRow.science_ratio),
        science_2_bonus: Number(ruleRow.science_2_bonus),
        english_conversion_table: ruleRow.english_conversion_table,
      });
    } catch {
      continue;
    }

    const med =
      applyMedShift &&
      adm.med_shift_coeff != null &&
      Number.isFinite(Number(adm.med_shift_coeff))
        ? Number(adm.med_shift_coeff)
        : 0;

    const { signal, probability, gap } = calcAdmissionSignal({
      myScore: converted_score,
      cutoff,
      scoreType: "suneung",
      medShiftCoeff: med,
    });

    const adjusted_cutoff = Number((cutoff + med).toFixed(4));

    univResults.push({
      university_name,
      major_group: ruleRow.major_group,
      admission_name: adm.dept_name,
      cutoff,
      adjusted_cutoff,
      converted_score,
      signal,
      probability_percent: Math.round(probability * 1000) / 10,
      gap: Number(gap.toFixed(4)),
      med_shift_applied: med !== 0,
    });
  }

  const duration_ms = Math.round(performance.now() - started);

  return NextResponse.json({
    data: {
      estimatedScores: gachae.estimatedScores,
      warning: gachae.warning,
      univResults,
      meta: {
        admission_year: admissionYear,
        duration_ms,
        med_shift_enabled: applyMedShift,
        universities_with_result: univResults.length,
      },
    },
    error: null,
  });
}
