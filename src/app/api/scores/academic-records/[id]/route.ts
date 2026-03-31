import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  NEIS_SEMESTER_TO_EXAM_DATE,
  schoolGpaFormSchema,
  type SchoolGpaFormValues,
} from "@/lib/validation/schoolGpaScore";

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: row, error } = await supabase
    .from("students")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
        { status: 500 },
      ),
    };
  }

  if (row?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "관리자만 수정/삭제할 수 있습니다." } },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

function toSchoolRow(values: SchoolGpaFormValues) {
  const exam_date = NEIS_SEMESTER_TO_EXAM_DATE[values.semester];
  const base = {
    record_type: "SCHOOL_GPA" as const,
    exam_date,
    semester: values.semester,
    subject_category: values.subject_category,
    subject_name: values.subject_name,
    credit_unit: values.credit_unit,
  };

  if (values.subject_category === "general") {
    return {
      ...base,
      total_score: values.total_score,
      raw_score: values.raw_score,
      avg_score: values.avg_score,
      stddev_score: values.stddev_score,
      student_count: values.student_count,
      class_rank: values.class_rank,
      rank_total: values.rank_total,
      school_grade: values.school_grade,
      achievement_level: values.achievement_level || null,
    };
  }

  if (values.subject_category === "career_choice") {
    return {
      ...base,
      total_score: values.total_score ?? null,
      raw_score: values.raw_score,
      avg_score: values.avg_score,
      stddev_score: values.stddev_score,
      student_count: values.student_count,
      class_rank: null,
      rank_total: null,
      school_grade: null,
      achievement_level: values.achievement_level,
    };
  }

  return {
    ...base,
    total_score: null,
    raw_score: values.raw_score,
    avg_score: null,
    stddev_score: null,
    student_count: null,
    class_rank: null,
    rank_total: null,
    school_grade: null,
    achievement_level: values.achievement_level,
  };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const admin = await requireAdmin(supabase, user.id);
  if (!admin.ok) return admin.response;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "잘못된 id입니다." } },
      { status: 422 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsedBody = schoolGpaFormSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsedBody.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
        },
      },
      { status: 422 },
    );
  }

  const { id } = parsedParams.data;
  const { data: existing, error: findError } = await supabase
    .from("academic_records")
    .select("id, student_id, record_type")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: findError.message } },
      { status: 500 },
    );
  }

  if (!existing || existing.student_id !== user.id) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "성적을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  if (existing.record_type !== "SCHOOL_GPA") {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "내신 성적만 수정할 수 있습니다." } },
      { status: 422 },
    );
  }

  const updateRow = toSchoolRow(parsedBody.data);
  const { data, error } = await supabase
    .from("academic_records")
    .update(updateRow)
    .eq("id", id)
    .eq("student_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "성적을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data, error: null });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const admin = await requireAdmin(supabase, user.id);
  if (!admin.ok) return admin.response;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "잘못된 id입니다." } },
      { status: 422 },
    );
  }

  const { id } = parsedParams.data;
  const { data, error } = await supabase
    .from("academic_records")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id)
    .eq("record_type", "SCHOOL_GPA")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "성적을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { deleted_id: id }, error: null });
}
