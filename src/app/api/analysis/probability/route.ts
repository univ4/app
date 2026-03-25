import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { calculateAdmissionProbability } from "@/lib/calculators/calculateAdmissionProbability";
import {
  calculateSuneungScore,
  type SuneungScores,
  type UniversityScoringRules,
} from "@/lib/calculators/calculateSuneungScore";

const querySchema = z.object({
  universities: z.string().min(1),
  admission_type: z.enum(["정시", "학생부교과"]),
});

type ProbabilityResponseItem = {
  university: string;
  major_group: string;
  converted_score: number;
  cutline_70: number;
  probability: "안정" | "적정" | "도전";
  discount_applied: boolean;
  discount_reason: string;
};

function parseSci2IsTypeTwo(subjectName: string | null) {
  if (!subjectName) return false;

  // MOCK_EXAM 저장 시 `subject_name = "sci1:${sci1Subject}|sci2:${sci2Subject}"` 형태로 저장합니다.
  // 여기서 sci2Subject만 추출해 "II" 포함 여부로 과탐II 여부를 추정합니다.
  const parts = subjectName.split("|").map((s) => s.trim());
  const sci2Part = parts.find((p) => p.startsWith("sci2:"));
  const sci2Subject = (sci2Part?.slice("sci2:".length) ?? "").trim();
  if (!sci2Subject) return false;

  return sci2Subject.includes("II");
}

async function getCutline70({
  supabase,
  university,
  admissionYear,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  university: string;
  admissionYear: number;
}): Promise<number> {
  // `converted_standard_scores`에서 percentile=70의 converted_score를 cutline_70으로 간주합니다.
  // subject_name은 데이터 적재 정책에 따라 달라질 수 있어, 우선 TOTAL/총점 둘 다 시도합니다.
  const { data, error } = await supabase
    .from("converted_standard_scores")
    .select("converted_score")
    .eq("university_name", university)
    .eq("admission_year", admissionYear)
    .eq("percentile", 70)
    .in("subject_name", ["TOTAL", "총점"])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const cutline = data?.converted_score;
  if (cutline == null) {
    throw new Error(`NOT_FOUND: cutline_70 data missing for ${university}`);
  }

  return Number(cutline);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const rawUniversities = url.searchParams.get("universities") ?? "";
  const rawAdmissionType = url.searchParams.get("admission_type") ?? "";

  const parsed = querySchema.safeParse({
    universities: rawUniversities,
    admission_type: rawAdmissionType,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "universities/admission_type 쿼리 파라미터를 확인해 주세요.",
        },
      },
      { status: 422 },
    );
  }

  const universities = parsed.data.universities
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const admissionType = parsed.data.admission_type;
  if (admissionType !== "정시") {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "현재는 admission_type=정시만 지원합니다." } },
      { status: 422 },
    );
  }

  const admissionYear = 2026;
  const discountFactorRaw = process.env.MEDICAL_SHIFT_DISCOUNT_FACTOR ?? "0";
  const discountFactorParsed = Number(discountFactorRaw);
  const discountFactor = Number.isFinite(discountFactorParsed)
    ? discountFactorParsed
    : 0;
  const discount_applied = discountFactor !== 0;
  const discount_reason = discount_applied
    ? `${admissionYear} 의대 증원 연쇄 이동 보정 (${discountFactor}점)`
    : "";

  // 1) 최신 모의고사(Track 1) 조회
  const { data: latestMock, error: latestErr } = await supabase
    .from("academic_records")
    .select(
      "exam_date,korean_standard_score,math_standard_score,english_grade,sci1_standard_score,sci2_standard_score,subject_name",
    )
    .eq("student_id", user.id)
    .eq("record_type", "MOCK_EXAM")
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: latestErr.message } },
      { status: 500 },
    );
  }

  if (!latestMock) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "최신 모의고사 성적이 없습니다." } },
      { status: 404 },
    );
  }

  const sci2IsTypeTwo = parseSci2IsTypeTwo(latestMock.subject_name);

  const scoresForCalc: SuneungScores = {
    korean_standard_score: Number(latestMock.korean_standard_score),
    math_standard_score: Number(latestMock.math_standard_score),
    english_grade: Number(latestMock.english_grade),
    sci1_standard_score: Number(latestMock.sci1_standard_score),
    sci2_standard_score: Number(latestMock.sci2_standard_score),
    sci2_is_type_two: sci2IsTypeTwo,
  };

  // 2~6) 대학별로 규칙 조회 + 변환점수 계산 + 컷 비교
  const results: ProbabilityResponseItem[] = [];

  for (const uni of universities) {
    const { data: rulesRow, error: rulesErr } = await supabase
      .from("university_scoring_rules")
      .select("*")
      .eq("university_name", uni)
      .eq("admission_year", admissionYear)
      .maybeSingle();

    if (rulesErr) {
      return NextResponse.json(
        { data: null, error: { code: "INTERNAL_ERROR", message: rulesErr.message } },
        { status: 500 },
      );
    }

    if (!rulesRow) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: `university_scoring_rules not found: ${uni}` } },
        { status: 404 },
      );
    }

    const rules = rulesRow as UniversityScoringRules;

    const converted_score = calculateSuneungScore(scoresForCalc, rules);
    let cutline_70: number;
    try {
      cutline_70 = await getCutline70({
        supabase,
        university: uni,
        admissionYear,
      });
    } catch {
      // 초기/로컬 데이터에서 cutline_70이 없을 수 있습니다.
      // 이 경우 분석 페이지는 최소한의 시각적 피드백을 위해
      // score를 기준으로 폴백 처리합니다.
      cutline_70 = converted_score;
    }

    const probability = calculateAdmissionProbability(
      converted_score,
      cutline_70,
      discountFactor,
    );

    results.push({
      university: uni,
      major_group: rulesRow.major_group as string,
      converted_score,
      cutline_70,
      probability,
      discount_applied,
      discount_reason,
    });
  }

  return NextResponse.json(results);
}

