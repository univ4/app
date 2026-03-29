import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { awardPostSchema } from "@/lib/student-record/studentRecordZod";

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_awards")
    .select(
      "id, student_id, grade, semester, award_name, rank, award_date, organization, participants, created_at",
    )
    .eq("student_id", ctx.recordStudentId)
    .order("grade", { ascending: true })
    .order("semester", { ascending: true })
    .order("created_at", { ascending: true });

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

  const parsed = awardPostSchema.safeParse(body);
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
    semester: parsed.data.semester,
    award_name: parsed.data.award_name,
    rank:
      parsed.data.rank != null && String(parsed.data.rank).trim() !== ""
        ? String(parsed.data.rank).trim()
        : null,
    award_date: parsed.data.award_date ?? null,
    organization:
      parsed.data.organization != null && String(parsed.data.organization).trim() !== ""
        ? String(parsed.data.organization).trim()
        : null,
    participants:
      parsed.data.participants != null && String(parsed.data.participants).trim() !== ""
        ? String(parsed.data.participants).trim()
        : null,
  };

  const { data, error } = await ctx.supabase
    .from("student_awards")
    .insert(row)
    .select(
      "id, student_id, grade, semester, award_name, rank, award_date, organization, participants, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null }, { status: 201 });
}
