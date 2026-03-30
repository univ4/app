import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { calcGradeSimulator } from "@/lib/calculators/calcGradeSimulator";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const ADMISSION_YEAR_MIN = 2020;
const ADMISSION_YEAR_MAX = 2035;

const currentSubjectSchema = z.object({
  subjectName: z.string().min(1),
  currentGrade: z.number(),
  creditUnit: z.number(),
  semester: z.string(),
});

const targetGradeSchema = z.object({
  subjectName: z.string().min(1),
  targetGrade: z.number(),
  semester: z.string().optional(),
});

const postBodySchema = z.object({
  currentSubjects: z.array(currentSubjectSchema).min(1),
  targetGrades: z.array(targetGradeSchema),
  targetUniv: z.string().optional(),
  cutoffGrade: z.number().optional(),
});

function parseAdmissionYear(raw: string | null): number | null {
  if (raw == null || raw === "") return 2027;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < ADMISSION_YEAR_MIN || n > ADMISSION_YEAR_MAX) {
    return null;
  }
  return n;
}

function aggregateUnivCutoffs(
  rows: { univ_name: string; cutoff_score: string | number | null }[],
): { univName: string; cutoffGrade: number }[] {
  const best = new Map<string, number>();
  for (const row of rows) {
    const c = Number(row.cutoff_score);
    if (!Number.isFinite(c)) continue;
    const prev = best.get(row.univ_name);
    if (prev === undefined || c < prev) {
      best.set(row.univ_name, c);
    }
  }
  return [...best.entries()]
    .map(([univName, cutoffGrade]) => ({ univName, cutoffGrade }))
    .sort((a, b) => a.univName.localeCompare(b.univName, "ko"));
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

  const admissionYear = parseAdmissionYear(request.nextUrl.searchParams.get("admissionYear"));
  if (admissionYear === null) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: `admissionYear는 ${ADMISSION_YEAR_MIN}~${ADMISSION_YEAR_MAX} 정수여야 합니다.`,
        },
      },
      { status: 422 },
    );
  }

  const [{ data: records, error: recErr }, { data: admRows, error: admErr }] =
    await Promise.all([
      supabase
        .from("academic_records")
        .select("id, subject_name, school_grade, credit_unit, semester, exam_date")
        .eq("student_id", user.id)
        .eq("record_type", "SCHOOL_GPA")
        .order("semester", { ascending: true })
        .order("subject_name", { ascending: true }),
      supabase
        .from("admission_records")
        .select("univ_name, cutoff_score")
        .eq("year", admissionYear)
        .eq("admission_type", "학생부교과")
        .not("cutoff_score", "is", null),
    ]);

  if (recErr || admErr) {
    const msg = recErr?.message ?? admErr?.message ?? "unknown";
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      records: records ?? [],
      universities: aggregateUnivCutoffs(admRows ?? []),
      admissionYear,
    },
    error: null,
  });
}

export async function POST(request: NextRequest) {
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

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "currentSubjects·targetGrades 형식을 확인해 주세요.",
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = calcGradeSimulator({
      currentSubjects: parsed.data.currentSubjects,
      targetGrades: parsed.data.targetGrades,
      targetUniv: parsed.data.targetUniv,
      cutoffGrade: parsed.data.cutoffGrade,
    });

    return NextResponse.json({
      data: { result },
      error: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("ValidationError:")) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }
}
