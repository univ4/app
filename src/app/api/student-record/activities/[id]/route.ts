import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { activityPutSchema } from "@/lib/student-record/studentRecordZod";

const idParamSchema = z.string().uuid();

function normalizeActivityPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...patch };
  if (out.activity_type !== undefined && out.activity_type !== "진로활동") {
    out.hope_field = null;
  }
  if (out.activity_type === "진로활동" && out.hope_field !== undefined) {
    const h = out.hope_field;
    out.hope_field =
      h != null && String(h).trim() !== "" ? String(h).trim() : null;
  }
  return out;
}

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

  const parsed = activityPutSchema.safeParse(body);
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

  const raw = { ...parsed.data } as Record<string, unknown>;
  if (raw.content !== undefined && String(raw.content).trim().length === 0) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "내용을 입력하세요." } },
      { status: 422 },
    );
  }

  const entries = Object.entries(raw).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "수정할 필드를 한 개 이상 보내 주세요." },
      },
      { status: 422 },
    );
  }

  const patch = normalizeActivityPatch(Object.fromEntries(entries));

  const { data, error } = await ctx.supabase
    .from("student_activities")
    .update(patch)
    .eq("id", idParsed.data)
    .eq("student_id", ctx.recordStudentId)
    .select("id, student_id, grade, activity_type, hours, hope_field, content")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "CONFLICT",
            message: "해당 학년·영역 조합이 이미 있습니다.",
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
      { data: null, error: { code: "NOT_FOUND", message: "해당 창체를 찾을 수 없습니다." } },
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
    .from("student_activities")
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
      { data: null, error: { code: "NOT_FOUND", message: "해당 창체를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { deleted_id: data.id },
    error: null,
  });
}
