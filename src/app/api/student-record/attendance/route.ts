import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { attendancePutSchema } from "@/lib/student-record/studentRecordZod";

const ATT_SELECT =
  "id, student_id, grade, school_days, absence_illness, absence_unauthorized, absence_other, late_illness, late_unauthorized, late_other, early_leave_illness, early_leave_unauthorized, early_leave_other, result_illness, result_unauthorized, result_other, note";

function normNote(note: string | null | undefined): string | null {
  if (note == null) return null;
  const t = note.trim();
  return t.length === 0 ? null : t;
}

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_attendance")
    .select(ATT_SELECT)
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

  const parsed = attendancePutSchema.safeParse(body);
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

  const p = parsed.data;
  const row = {
    student_id: ctx.recordStudentId,
    grade: p.grade,
    school_days: p.school_days === undefined ? null : p.school_days,
    absence_illness: p.absence_illness,
    absence_unauthorized: p.absence_unauthorized,
    absence_other: p.absence_other,
    late_illness: p.late_illness,
    late_unauthorized: p.late_unauthorized,
    late_other: p.late_other,
    early_leave_illness: p.early_leave_illness,
    early_leave_unauthorized: p.early_leave_unauthorized,
    early_leave_other: p.early_leave_other,
    result_illness: p.result_illness,
    result_unauthorized: p.result_unauthorized,
    result_other: p.result_other,
    note: normNote(p.note ?? undefined),
  };

  const { data: existing, error: selErr } = await ctx.supabase
    .from("student_attendance")
    .select("id")
    .eq("student_id", ctx.recordStudentId)
    .eq("grade", p.grade)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: selErr.message } },
      { status: 500 },
    );
  }

  if (existing?.id) {
    const { data, error } = await ctx.supabase
      .from("student_attendance")
      .update({
        school_days: row.school_days,
        absence_illness: row.absence_illness,
        absence_unauthorized: row.absence_unauthorized,
        absence_other: row.absence_other,
        late_illness: row.late_illness,
        late_unauthorized: row.late_unauthorized,
        late_other: row.late_other,
        early_leave_illness: row.early_leave_illness,
        early_leave_unauthorized: row.early_leave_unauthorized,
        early_leave_other: row.early_leave_other,
        result_illness: row.result_illness,
        result_unauthorized: row.result_unauthorized,
        result_other: row.result_other,
        note: row.note,
      })
      .eq("id", existing.id)
      .eq("student_id", ctx.recordStudentId)
      .select(ATT_SELECT)
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
    .from("student_attendance")
    .insert(row)
    .select(ATT_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null }, { status: 201 });
}
