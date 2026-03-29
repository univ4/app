import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";

const idParamSchema = z.string().uuid();

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
    .from("student_school_violence")
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
      { data: null, error: { code: "NOT_FOUND", message: "해당 조치 기록을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { deleted_id: data.id },
    error: null,
  });
}
