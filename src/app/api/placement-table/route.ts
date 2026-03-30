import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { calcPlacementTable } from "@/lib/calculators/calcPlacementTable";
import {
  calculateSuneungScore,
  type SuneungScores,
  type UniversityScoringRules,
} from "@/lib/calculators/calculateSuneungScore";
import { classifyUnivRegion, type UnivRegionBucket } from "@/lib/signals/univRegion";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const REFERENCE_UNIV = "서강대";
const REFERENCE_MAJOR = "자연계열";

const querySchema = z.object({
  myScore: z.coerce.number().finite().optional(),
  medShift: z.enum(["0", "1"]).optional(),
  region: z.enum(["seoul", "sudogwon", "all"]).optional(),
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
});

type DbJeongsiRow = {
  univ_name: string;
  dept_name: string;
  admission_type: string;
  cutoff_score: number | null;
  med_shift_coeff: number | null;
};

function regionMatches(bucket: UnivRegionBucket, filter: "seoul" | "sudogwon" | "all"): boolean {
  if (filter === "all") return true;
  if (filter === "seoul") return bucket === "seoul";
  return bucket === "seoul" || bucket === "capital";
}

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
    myScore: url.searchParams.get("myScore") ?? undefined,
    medShift: url.searchParams.get("medShift") ?? undefined,
    region: url.searchParams.get("region") ?? undefined,
    admissionYear: url.searchParams.get("admissionYear") ?? undefined,
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
  const regionFilter = parsed.data.region ?? "all";

  const [
    { data: admissionRows, error: admErr },
    { data: scoringRows, error: scoreErr },
    { data: latestMock, error: mockErr },
  ] = await Promise.all([
    supabase
      .from("admission_records")
      .select("univ_name, dept_name, admission_type, cutoff_score, med_shift_coeff")
      .eq("year", admissionYear)
      .eq("admission_type", "정시")
      .not("cutoff_score", "is", null),
    supabase
      .from("university_scoring_rules")
      .select(
        "university_name, major_group, korean_ratio, math_ratio, english_ratio, science_ratio, science_2_bonus, english_conversion_table",
      )
      .eq("admission_year", admissionYear)
      .eq("university_name", REFERENCE_UNIV)
      .eq("major_group", REFERENCE_MAJOR)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("academic_records")
      .select(
        "korean_standard_score,math_standard_score,english_grade,sci1_standard_score,sci2_standard_score,subject_name",
      )
      .eq("student_id", user.id)
      .eq("record_type", "MOCK_EXAM")
      .order("exam_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (admErr || scoreErr || mockErr) {
    const msg = admErr?.message ?? scoreErr?.message ?? mockErr?.message ?? "unknown";
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }

  let suggestedMyScore: number | null = null;
  let suggestedReference: string | null = null;

  if (latestMock && scoringRows) {
    const row = scoringRows as {
      university_name: string;
      major_group: string;
      korean_ratio: number;
      math_ratio: number;
      english_ratio: number;
      science_ratio: number;
      science_2_bonus: number;
      english_conversion_table: Record<string, number>;
    };

    const sci2IsTypeTwo = parseSci2IsTypeTwo(latestMock.subject_name);
    const suneungScores: SuneungScores = {
      korean_standard_score: Number(latestMock.korean_standard_score),
      math_standard_score: Number(latestMock.math_standard_score),
      english_grade: Number(latestMock.english_grade),
      sci1_standard_score: Number(latestMock.sci1_standard_score),
      sci2_standard_score: Number(latestMock.sci2_standard_score),
      sci2_is_type_two: sci2IsTypeTwo,
    };

    const rules: UniversityScoringRules = {
      korean_ratio: Number(row.korean_ratio),
      math_ratio: Number(row.math_ratio),
      english_ratio: Number(row.english_ratio),
      science_ratio: Number(row.science_ratio),
      science_2_bonus: Number(row.science_2_bonus),
      english_conversion_table: row.english_conversion_table as Record<string, number>,
    };

    try {
      suggestedMyScore = calculateSuneungScore(suneungScores, rules);
      suggestedReference = `${row.university_name} ${row.major_group}`;
    } catch {
      suggestedMyScore = null;
    }
  }

  let myScore = parsed.data.myScore;
  if (myScore == null || !Number.isFinite(myScore)) {
    if (suggestedMyScore != null && Number.isFinite(suggestedMyScore)) {
      myScore = suggestedMyScore;
    } else {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "myScore를 입력하거나 최근 모의고사를 등록해 주세요.",
          },
        },
        { status: 422 },
      );
    }
  }

  const filtered = (admissionRows ?? []).filter((r: DbJeongsiRow) => {
    const bucket = classifyUnivRegion(r.univ_name);
    return regionMatches(bucket, regionFilter);
  });

  const table = calcPlacementTable({
    myScore,
    applyMedShift,
    admissionRecords: filtered.map((r: DbJeongsiRow) => ({
      univName: r.univ_name,
      deptName: r.dept_name,
      cutoffScore: Number(r.cutoff_score),
      admissionType: r.admission_type,
      medShiftCoeff: r.med_shift_coeff,
    })),
  });

  const duration_ms = Math.round(performance.now() - started);

  return NextResponse.json({
    data: {
      safe: table.safe,
      moderate: table.moderate,
      challenge: table.challenge,
      meta: {
        admission_year: admissionYear,
        my_score_used: myScore,
        med_shift_enabled: applyMedShift,
        region: regionFilter,
        row_count_jeongsi_filtered: filtered.length,
        suggested_my_score: suggestedMyScore,
        suggested_reference: suggestedReference,
        has_mock_exam: latestMock != null,
        duration_ms,
      },
    },
    error: null,
  });
}
