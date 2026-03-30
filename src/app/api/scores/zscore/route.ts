import { NextResponse } from "next/server";

import { calcSchoolLevel, zScoreBandLabel } from "@/lib/calculators/calcSchoolLevel";
import { calculateZScore } from "@/lib/calculators/calculateZScore";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type SchoolGpaRow = {
  id: number;
  semester: string | null;
  subject_name: string | null;
  subject_category: string | null;
  raw_score: number | null;
  avg_score: number | null;
  stddev_score: number | null;
  student_count: number | null;
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** 표준편차·수강자수: 0 이하이면 Z 산출 불가 */
function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function subjectLabel(row: SchoolGpaRow): string {
  const sem = row.semester?.trim() || "?";
  const name = row.subject_name?.trim() || "과목";
  return `${sem} · ${name}`;
}

/**
 * PRD P1-2: 원점수·과목평균·표준편차·수강자수가 모두 유효할 때만 해당 과목 Z 산출에 포함.
 */
function buildSubjectPayload(rows: SchoolGpaRow[]) {
  const subjects = rows.map((row) => {
    const raw = row.raw_score;
    const avg = row.avg_score;
    const std = row.stddev_score;
    const count = row.student_count;

    let zScore: number | null = null;
    let omitReason: string | null = null;

    if (!isFiniteNumber(raw) || !isFiniteNumber(avg) || !isPositiveFinite(std)) {
      omitReason = "원점수·과목평균·표준편차를 모두 입력한 과목만 계산됩니다.";
    } else if (!isPositiveFinite(count)) {
      omitReason = "수강자수가 입력된 과목만 계산됩니다.";
    } else {
      // isPositiveFinite(std) 이면 std > 0 이므로 calculateZScore는 항상 유한 숫자 반환
      zScore = calculateZScore(raw, avg, std)!;
    }

    return {
      id: row.id,
      semester: row.semester,
      subjectName: row.subject_name,
      subjectCategory: row.subject_category,
      zScore,
      bandLabel: zScore !== null ? zScoreBandLabel(zScore) : null,
      omitReason,
    };
  });

  const forCalc = rows
    .map((row) => {
      const raw = row.raw_score;
      const avg = row.avg_score;
      const std = row.stddev_score;
      const count = row.student_count;
      if (!isFiniteNumber(raw) || !isFiniteNumber(avg) || !isPositiveFinite(std) || !isPositiveFinite(count)) {
        return null;
      }
      return {
        subjectName: subjectLabel(row),
        rawScore: raw,
        classAvg: avg,
        stdDev: std,
        studentCount: count,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const schoolLevel = calcSchoolLevel({ subjects: forCalc });

  return { subjects, schoolLevel };
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

  const { data, error } = await supabase
    .from("academic_records")
    .select("id, semester, subject_name, subject_category, raw_score, avg_score, stddev_score, student_count")
    .eq("record_type", "SCHOOL_GPA")
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as SchoolGpaRow[];
  const payload = buildSubjectPayload(rows);

  return NextResponse.json({
    data: {
      subjects: payload.subjects,
      schoolLevel: payload.schoolLevel,
    },
    error: null,
  });
}
