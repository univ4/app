import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

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

const schoolGpaSchema = z.object({
  record_type: z.literal("SCHOOL_GPA"),
  exam_date: z.string().min(1),
  subject_name: z.string().min(1),
  raw_score: z.coerce.number(),
  avg_score: z.coerce.number(),
  stddev_score: z.coerce.number(),
  student_count: z.coerce.number().int().positive(),
  credit_unit: z.coerce.number().int().positive(),
  school_grade: z.coerce.number().min(1).max(9),
  achievement_level: z.enum(["A", "B", "C"]).optional().or(z.literal("")),
});

const scoreSchema = z.union([mockExamSchema, schoolGpaSchema]);

export async function GET(request: Request) {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    insertPayload = {
      student_id: user.id,
      record_type: parsed.data.record_type,
      exam_date: parsed.data.exam_date,
      subject_name: parsed.data.subject_name,
      raw_score: parsed.data.raw_score,
      avg_score: parsed.data.avg_score,
      stddev_score: parsed.data.stddev_score,
      student_count: parsed.data.student_count,
      credit_unit: parsed.data.credit_unit,
      school_grade: parsed.data.school_grade,
      achievement_level: parsed.data.achievement_level || null,
    };
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
