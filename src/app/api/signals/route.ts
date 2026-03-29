import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { SuneungScores } from "@/lib/calculators/calculateSuneungScore";
import {
  buildAdmissionSignalRows,
  type BuildAdmissionSignalRowsInput,
  type DbAdmissionRecord,
} from "@/lib/signals/buildAdmissionSignalRows";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";

const querySchema = z.object({
  studentId: z.string().uuid().optional(),
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
  medShift: z.enum(["0", "1"]).optional(),
});

export async function GET(request: NextRequest) {
  const started = performance.now();
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
    studentId: url.searchParams.get("studentId") ?? undefined,
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

  const targetStudentId = parsed.data.studentId ?? user.id;
  if (targetStudentId !== user.id) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "다른 학생 신호등은 조회할 수 없습니다." },
      },
      { status: 403 },
    );
  }

  const admissionYear = parsed.data.admissionYear ?? 2026;
  const applyMedShift = parsed.data.medShift === "1";

  const [
    { data: admissionRows, error: admErr },
    { data: scoringRows, error: scoreRulesErr },
    { data: susiRows, error: susiErr },
    { data: gpaRows, error: gpaErr },
    { data: latestMock, error: mockErr },
  ] = await Promise.all([
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
      .eq("student_id", targetStudentId)
      .eq("record_type", "SCHOOL_GPA"),
    supabase
      .from("academic_records")
      .select(
        "exam_date,korean_standard_score,math_standard_score,english_grade,sci1_standard_score,sci2_standard_score,subject_name",
      )
      .eq("student_id", targetStudentId)
      .eq("record_type", "MOCK_EXAM")
      .order("exam_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

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

  const duration_ms = Math.round(performance.now() - started);
  const uniqueUniversities = new Set(items.map((r) => r.university_name)).size;

  return NextResponse.json({
    data: {
      items,
      meta: {
        admission_year: admissionYear,
        row_count: items.length,
        unique_universities: uniqueUniversities,
        duration_ms,
        med_shift_enabled: applyMedShift,
        has_mock_exam: latestMock != null,
        has_school_gpa: (gpaRows?.length ?? 0) > 0,
      },
    },
    error: null,
  });
}
