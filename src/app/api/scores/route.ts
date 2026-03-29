import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  NEIS_SEMESTER_TO_EXAM_DATE,
  schoolGpaPostSchema,
  type SchoolGpaPostBody,
} from "@/lib/validation/schoolGpaScore";

const mockExamSchema = z.object({
  record_type: z.literal("MOCK_EXAM"),
  exam_date: z.string().min(1),
  korean_standard_score: z.coerce.number().optional(),
  korean_percentile: z.coerce.number().optional(),
  korean_grade: z.coerce.number().int().min(1).max(9),
  math_standard_score: z.coerce.number().optional(),
  math_percentile: z.coerce.number().optional(),
  math_grade: z.coerce.number().int().min(1).max(9),
  english_grade: z.coerce.number().int().min(1).max(9),
  sci1_subject: z.string().min(1),
  sci1_standard_score: z.coerce.number(),
  sci1_percentile: z.coerce.number(),
  sci2_subject: z.string().min(1),
  sci2_standard_score: z.coerce.number(),
  sci2_percentile: z.coerce.number(),
});

const scoreSchema = z.union([mockExamSchema, schoolGpaPostSchema]);

function schoolGpaInsertRow(data: SchoolGpaPostBody, studentId: string) {
  const exam_date = NEIS_SEMESTER_TO_EXAM_DATE[data.semester];
  const base = {
    student_id: studentId,
    record_type: "SCHOOL_GPA" as const,
    exam_date,
    semester: data.semester,
    subject_category: data.subject_category,
    subject_name: data.subject_name,
    credit_unit: data.credit_unit,
  };

  if (data.subject_category === "general") {
    return {
      ...base,
      total_score: data.total_score,
      raw_score: data.raw_score,
      avg_score: data.avg_score,
      stddev_score: data.stddev_score,
      student_count: data.student_count,
      class_rank: data.class_rank,
      rank_total: data.rank_total,
      school_grade: data.school_grade,
      achievement_level: data.achievement_level || null,
    };
  }

  if (data.subject_category === "career_choice") {
    return {
      ...base,
      total_score: data.total_score ?? null,
      raw_score: data.raw_score,
      avg_score: data.avg_score,
      stddev_score: data.stddev_score,
      student_count: data.student_count,
      class_rank: null,
      rank_total: null,
      school_grade: null,
      achievement_level: data.achievement_level,
    };
  }

  return {
    ...base,
    total_score: null,
    raw_score: data.raw_score,
    avg_score: null,
    stddev_score: null,
    student_count: null,
    class_rank: null,
    rank_total: null,
    school_grade: null,
    achievement_level: data.achievement_level,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 100);
  const offset = Number(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("academic_records")
    .select("*", { count: "exact" })
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type === "MOCK_EXAM" || type === "SCHOOL_GPA") {
    query = query.eq("record_type", type);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      items: data ?? [],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    },
    error: null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const payload = await request.json();
  const parsed = scoreSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

  let insertPayload: Record<string, unknown>;

  if (parsed.data.record_type === "MOCK_EXAM") {
    insertPayload = {
      student_id: user.id,
      record_type: parsed.data.record_type,
      exam_date: parsed.data.exam_date,
      korean_standard_score: parsed.data.korean_standard_score,
      korean_percentile: parsed.data.korean_percentile,
      korean_grade: parsed.data.korean_grade,
      math_standard_score: parsed.data.math_standard_score,
      math_percentile: parsed.data.math_percentile,
      math_grade: parsed.data.math_grade,
      english_grade: parsed.data.english_grade,
      sci1_standard_score: parsed.data.sci1_standard_score,
      sci1_percentile: parsed.data.sci1_percentile,
      sci2_standard_score: parsed.data.sci2_standard_score,
      sci2_percentile: parsed.data.sci2_percentile,
      // DB 스키마상 과탐 과목명 전용 컬럼이 없어 subject_name에 직렬화 저장
      subject_name: `sci1:${parsed.data.sci1_subject}|sci2:${parsed.data.sci2_subject}`,
    };
  } else {
    insertPayload = schoolGpaInsertRow(parsed.data, user.id);
  }

  const { data, error } = await supabase
    .from("academic_records")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
