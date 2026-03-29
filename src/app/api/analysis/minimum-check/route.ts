import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  checkSuneungMinimum,
  parseSuneungMinimumCondition,
  type SuneungGrades,
  type SuneungMinimumRule,
} from "@/lib/calculators/checkSuneungMinimum";
import {
  calcSuneungMinimumProbability,
  probabilityScoresFromRuleSubjects,
} from "@/lib/calculators/calcSuneungMinimumProbability";

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

const postBodySchema = z.object({
  scores: z.array(
    z.object({
      subject: z.string().min(1),
      grade: z.number(),
    }),
  ),
  requirement: z.object({
    minGradeSum: z.number(),
    subjectCount: z.number(),
    hankoSaRequired: z.boolean(),
    hankoSaMaxGrade: z.number().optional(),
    englishMaxGrade: z.number().nullable().optional(),
  }),
  subjectsForSum: z.array(z.string().min(1)).optional(),
  trend: z
    .array(
      z.object({
        subject: z.string().min(1),
        grades: z.array(z.number()).min(1),
      }),
    )
    .optional(),
  sampleCount: z.number().int().positive().max(1_000_000).optional(),
  seed: z.number().int().optional(),
});

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function getThrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } },
      { status: 400 },
    );
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.flatten().formErrors.join("; ") || "Invalid body.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const out = calcSuneungMinimumProbability(parsed.data);
    return NextResponse.json({
      data: {
        probability: out.probability,
        expectedGradeSum: out.expectedGradeSum,
        riskLevel: out.riskLevel,
      },
      error: null,
    });
  } catch (e) {
    const msg = getThrownMessage(e);
    if (msg.startsWith("ValidationError:")) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

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

  if (!ruleRows || ruleRows.length === 0) {
    return NextResponse.json({
      data: {
        student_grades,
        results: [],
      },
      error: null,
    });
  }

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
        probability: null as number | null,
        expected_grade_sum: null as number | null,
        risk_level: null as string | null,
      };
    }

    const checked = checkSuneungMinimum(student_grades, rule);

    const parsedCond = parseSuneungMinimumCondition(rule.condition);
    let probability: number | null = null;
    let expected_grade_sum: number | null = null;
    let risk_level: string | null = null;

    if (parsedCond?.type === "SUM") {
      const sumKeys = rule.subjects.filter((s) =>
        ["korean", "math", "english", "sci1", "sci2"].includes(s),
      );
      let probScores = probabilityScoresFromRuleSubjects(student_grades, rule.subjects);
      if (
        rule.english_limit != null &&
        !probScores.some((p) => p.subject === "english")
      ) {
        probScores = [
          ...probScores,
          { subject: "english", grade: student_grades.english },
        ];
      }
      if (probScores.length >= parsedCond.pickCount) {
        try {
          const pr = calcSuneungMinimumProbability({
            scores: probScores,
            subjectsForSum: sumKeys,
            requirement: {
              minGradeSum: parsedCond.requiredSum,
              subjectCount: parsedCond.pickCount,
              hankoSaRequired: false,
              englishMaxGrade: rule.english_limit,
            },
            sampleCount: 8000,
            seed: seedFromString(
              `${row.university_name}|${row.admission_type}|${rule.condition}`,
            ),
          });
          probability = pr.probability;
          expected_grade_sum = pr.expectedGradeSum;
          risk_level = pr.riskLevel;
        } catch {
          probability = null;
          expected_grade_sum = null;
          risk_level = null;
        }
      }
    }

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
      probability,
      expected_grade_sum,
      risk_level,
    };
  });

  return NextResponse.json({
    data: {
      student_grades,
      results,
    },
    error: null,
  });
}
