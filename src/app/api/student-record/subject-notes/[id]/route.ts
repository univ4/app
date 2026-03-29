import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { subjectNotePutSchema } from "@/lib/student-record/studentRecordZod";

const idParamSchema = z.string().uuid();

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const admin = await requireAdmin(ctx.supabase, ctx.user.id);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "유효한 id가 아닙니다." } },
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

  const parsed = subjectNotePutSchema.safeParse(body);
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

  const patch = { ...parsed.data };
  if (patch.note !== undefined && patch.note.length === 0) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "내용을 입력하세요." } },
      { status: 422 },
    );
  }

  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "수정할 필드를 한 개 이상 보내 주세요." },
      },
      { status: 422 },
    );
  }

  const { data, error } = await ctx.supabase
    .from("student_subject_notes")
    .update(Object.fromEntries(entries))
    .eq("id", idParsed.data)
    .eq("student_id", ctx.recordStudentId)
    .select("id, student_id, grade, semester, subject_name, note")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "CONFLICT",
            message: "동일 학년·학기·과목명이 이미 있습니다.",
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

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "해당 세특을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const admin = await requireAdmin(ctx.supabase, ctx.user.id);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "유효한 id가 아닙니다." } },
      { status: 422 },
    );
  }

  const { data, error } = await ctx.supabase
    .from("student_subject_notes")
    .delete()
    .eq("id", idParsed.data)
    .eq("student_id", ctx.recordStudentId)
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
      { data: null, error: { code: "NOT_FOUND", message: "해당 세특을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { deleted_id: data.id },
    error: null,
  });
}
