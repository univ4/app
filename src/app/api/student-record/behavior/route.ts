import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { behaviorPutSchema } from "@/lib/student-record/studentRecordZod";

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_behavior")
    .select("id, student_id, grade, content")
    .eq("student_id", ctx.recordStudentId)
    .order("grade", { ascending: true });

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

export async function PUT(request: Request) {
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

  const parsed = behaviorPutSchema.safeParse(body);
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

  const row = {
    student_id: ctx.recordStudentId,
    grade: parsed.data.grade,
    content: parsed.data.content,
  };

  const { data: existing, error: selErr } = await ctx.supabase
    .from("student_behavior")
    .select("id")
    .eq("student_id", ctx.recordStudentId)
    .eq("grade", parsed.data.grade)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: selErr.message } },
      { status: 500 },
    );
  }

  if (existing?.id) {
    const { data, error } = await ctx.supabase
      .from("student_behavior")
      .update({ content: row.content })
      .eq("id", existing.id)
      .eq("student_id", ctx.recordStudentId)
      .select("id, student_id, grade, content")
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { item: data }, error: null });
  }

  const { data, error } = await ctx.supabase
    .from("student_behavior")
    .insert(row)
    .select("id, student_id, grade, content")
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null }, { status: 201 });
}
