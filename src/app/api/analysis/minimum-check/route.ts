import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  checkSuneungMinimum,
  type SuneungGrades,
  type SuneungMinimumRule,
} from "@/lib/calculators/checkSuneungMinimum";

type MinimumRuleRow = {
  university_name: string;
  admission_type: string;
  suneung_minimum: {
    condition?: string;
    subjects?: string[];
    english_limit?: number | null;
    major_group?: string;
  } | null;
};

export async function GET() {
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

  // 1) 최신 MOCK_EXAM 성적 조회
  const { data: latestMock, error: latestMockError } = await supabase
    .from("academic_records")
    .select("korean_grade, math_grade, english_grade, sci1_grade, sci2_grade")
    .eq("student_id", user.id)
    .eq("record_type", "MOCK_EXAM")
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestMockError) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: latestMockError.message } },
      { status: 500 },
    );
  }

  if (!latestMock) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "먼저 모의고사 성적을 입력해주세요" } },
      { status: 404 },
    );
  }

  const student_grades: SuneungGrades = {
    korean: Number(latestMock.korean_grade ?? 9),
    math: Number(latestMock.math_grade ?? 9),
    english: Number(latestMock.english_grade ?? 9),
    sci1: Number(latestMock.sci1_grade ?? 9),
    sci2: Number(latestMock.sci2_grade ?? 9),
  };

  // 2) suneung_minimum이 있는 규칙 전체 조회
  const { data: ruleRows, error: ruleError } = await supabase
    .from("susi_gpa_rules")
    .select("university_name, admission_type, suneung_minimum")
    .not("suneung_minimum", "is", null);

  if (ruleError) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: ruleError.message } },
      { status: 500 },
    );
  }

  // suneung_minimum 데이터가 없으면 빈 배열 반환
  if (!ruleRows || ruleRows.length === 0) {
    return NextResponse.json({
      student_grades,
      results: [],
    });
  }

  // 3) 각 행별 수능최저 충족 여부 계산
  const results = (ruleRows as MinimumRuleRow[]).map((row) => {
    const min = row.suneung_minimum ?? {};
    const rule: SuneungMinimumRule = {
      condition: String(min.condition ?? ""),
      subjects: Array.isArray(min.subjects)
        ? min.subjects.map((s) => String(s))
        : [],
      english_limit:
        typeof min.english_limit === "number" ? min.english_limit : null,
    };

    if (!rule.condition || rule.subjects.length === 0) {
      return {
        university: row.university_name,
        admission_type: row.admission_type,
        major_group: String(min.major_group ?? "자연계열"),
        condition: String(min.condition ?? ""),
        satisfied: false,
        best_combination: [],
        achieved_sum: Number.POSITIVE_INFINITY,
        required_sum: Number.POSITIVE_INFINITY,
        gap: Number.POSITIVE_INFINITY,
        english_satisfied: true,
      };
    }

    const checked = checkSuneungMinimum(student_grades, rule);

    return {
      university: row.university_name,
      admission_type: row.admission_type,
      major_group: String(min.major_group ?? "자연계열"),
      condition: rule.condition,
      satisfied: checked.satisfied,
      best_combination: checked.best_combination,
      achieved_sum: checked.achieved_sum,
      required_sum: checked.required_sum,
      gap: checked.gap,
      english_satisfied: checked.english_satisfied,
    };
  });

  return NextResponse.json({
    student_grades,
    results,
  });
}

