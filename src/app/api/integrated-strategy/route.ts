import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { calcIntegratedStrategy } from "@/lib/calculators/calcIntegratedStrategy";
import type { SuneungScores } from "@/lib/calculators/calculateSuneungScore";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  buildAdmissionSignalRows,
  type BuildAdmissionSignalRowsInput,
  type DbAdmissionRecord,
} from "@/lib/signals/buildAdmissionSignalRows";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";

const querySchema = z.object({
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
  medShift: z.enum(["0", "1"]).optional(),
});

function parsePortfolioCards(
  raw: unknown,
): { university: string; admissionType: string; signal: "safe" | "moderate" | "challenge" }[] {
  if (!Array.isArray(raw)) return [];
  const out: { university: string; admissionType: string; signal: "safe" | "moderate" | "challenge" }[] =
    [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const university = typeof rec.university === "string" ? rec.university : "";
    const admissionType = typeof rec.admissionType === "string" ? rec.admissionType : "";
    const signal =
      rec.signal === "safe" || rec.signal === "moderate" || rec.signal === "challenge"
        ? rec.signal
        : "moderate";
    if (!university.trim()) continue;
    out.push({ university, admissionType, signal });
  }
  return out;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    admissionYear: url.searchParams.get("admissionYear") ?? undefined,
    medShift: url.searchParams.get("medShift") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "쿼리 파라미터를 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const admissionYear = parsed.data.admissionYear ?? 2026;
  const applyMedShift = parsed.data.medShift === "1";

  const [
    { data: portfolioRow, error: portfolioErr },
    { data: admissionRows, error: admErr },
    { data: scoringRows, error: scoreRulesErr },
    { data: susiRows, error: susiErr },
    { data: gpaRows, error: gpaErr },
    { data: latestMock, error: mockErr },
  ] = await Promise.all([
    supabase.from("simulator_portfolios").select("cards").eq("student_id", user.id).maybeSingle(),
    supabase
      .from("admission_records")
      .select("id, univ_name, dept_name, admission_type, year, cutoff_score, med_shift_coeff")
      .eq("year", admissionYear),
    supabase
      .from("university_scoring_rules")
      .select(
        "university_name, major_group, korean_ratio, math_ratio, english_ratio, science_ratio, science_2_bonus, english_conversion_table",
      )
      .eq("admission_year", admissionYear),
    supabase
      .from("susi_gpa_rules")
      .select("university_name, admission_type, include_subjects, career_choice_conversion")
      .eq("admission_year", admissionYear)
      .in("admission_type", ["학생부교과", "학생부종합"]),
    supabase
      .from("academic_records")
      .select("subject_name, credit_unit, school_grade, achievement_level")
      .eq("student_id", user.id)
      .eq("record_type", "SCHOOL_GPA"),
    supabase
      .from("academic_records")
      .select(
        "exam_date,korean_standard_score,math_standard_score,english_grade,sci1_standard_score,sci2_standard_score,subject_name",
      )
      .eq("student_id", user.id)
      .eq("record_type", "MOCK_EXAM")
      .order("exam_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (portfolioErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: portfolioErr.message } },
      { status: 500 },
    );
  }

  if (admErr || scoreRulesErr || susiErr || gpaErr || mockErr) {
    const msg =
      admErr?.message ??
      scoreRulesErr?.message ??
      susiErr?.message ??
      gpaErr?.message ??
      mockErr?.message ??
      "unknown";
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }

  let suneungScores: SuneungScores | null = null;
  if (latestMock) {
    const sci2IsTypeTwo = parseSci2IsTypeTwo(latestMock.subject_name);
    suneungScores = {
      korean_standard_score: Number(latestMock.korean_standard_score),
      math_standard_score: Number(latestMock.math_standard_score),
      english_grade: Number(latestMock.english_grade),
      sci1_standard_score: Number(latestMock.sci1_standard_score),
      sci2_standard_score: Number(latestMock.sci2_standard_score),
      sci2_is_type_two: sci2IsTypeTwo,
    };
  }

  const items = buildAdmissionSignalRows({
    admissionRows: (admissionRows ?? []) as DbAdmissionRecord[],
    scoringRules: (scoringRows ?? []) as BuildAdmissionSignalRowsInput["scoringRules"],
    susiRules: (susiRows ?? []) as BuildAdmissionSignalRowsInput["susiRules"],
    schoolGpaRows: gpaRows ?? [],
    suneungScores,
    applyMedShift,
  });

  const jeongsiSignals = items
    .filter((r) => r.admission_type === "정시")
    .map((r) => ({ university: r.university_name, signal: r.signal }));

  const susiCards = parsePortfolioCards(portfolioRow?.cards);

  const result = calcIntegratedStrategy({
    susiCards,
    jeongsiSignals,
  });

  return NextResponse.json({
    data: {
      napchiRisks: result.napchiRisks,
      allFailScenario: result.allFailScenario,
      overallRisk: result.overallRisk,
      summary: result.summary,
    },
    error: null,
  });
}
