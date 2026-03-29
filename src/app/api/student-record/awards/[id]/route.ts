import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { awardPutSchema } from "@/lib/student-record/studentRecordZod";

const idParamSchema = z.string().uuid();

function normalizeAwardPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...patch };
  if (out.rank !== undefined) {
    const r = out.rank;
    out.rank = r != null && String(r).trim() !== "" ? String(r).trim() : null;
  }
  if (out.organization !== undefined) {
    const o = out.organization;
    out.organization = o != null && String(o).trim() !== "" ? String(o).trim() : null;
  }
  if (out.participants !== undefined) {
    const p = out.participants;
    out.participants = p != null && String(p).trim() !== "" ? String(p).trim() : null;
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

  const parsed = awardPutSchema.safeParse(body);
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

  const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "수정할 필드를 한 개 이상 보내 주세요." },
      },
      { status: 422 },
    );
  }

  const patch = normalizeAwardPatch(Object.fromEntries(entries));

  const { data, error } = await ctx.supabase
    .from("student_awards")
    .update(patch)
    .eq("id", idParsed.data)
    .eq("student_id", ctx.recordStudentId)
    .select(
      "id, student_id, grade, semester, award_name, rank, award_date, organization, participants, created_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "해당 수상을 찾을 수 없습니다." } },
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
    .from("student_awards")
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
      { data: null, error: { code: "NOT_FOUND", message: "해당 수상을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { deleted_id: data.id },
    error: null,
  });
}
