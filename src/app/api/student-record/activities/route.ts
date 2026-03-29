import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { activityPostSchema } from "@/lib/student-record/studentRecordZod";

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_activities")
    .select("id, student_id, grade, activity_type, hours, hope_field, content")
    .eq("student_id", ctx.recordStudentId)
    .order("grade", { ascending: true })
    .order("activity_type", { ascending: true });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { items: data ?? [] },
    error: null,
  });
}

export async function POST(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const admin = await requireAdmin(ctx.supabase, ctx.user.id);
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = activityPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.",
        },
      },
      { status: 422 },
    );
  }

  const hopeField =
    parsed.data.activity_type === "진로활동"
      ? parsed.data.hope_field != null && String(parsed.data.hope_field).trim() !== ""
        ? String(parsed.data.hope_field).trim()
        : null
      : null;

  const row = {
    student_id: ctx.recordStudentId,
    grade: parsed.data.grade,
    activity_type: parsed.data.activity_type,
    hours: parsed.data.hours ?? null,
    hope_field: hopeField,
    content: parsed.data.content,
  };

  const { data, error } = await ctx.supabase
    .from("student_activities")
    .insert(row)
    .select("id, student_id, grade, activity_type, hours, hope_field, content")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "CONFLICT",
            message: "해당 학년·영역 조합이 이미 있습니다. 기존 행을 수정하세요.",
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null }, { status: 201 });
}
