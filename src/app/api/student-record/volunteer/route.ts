import { NextResponse } from "next/server";

import { recalculateVolunteerCumulative } from "@/lib/student-record/recalculateVolunteerCumulative";
import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { volunteerPostSchema } from "@/lib/student-record/studentRecordZod";

const VOL_SELECT =
  "id, student_id, grade, period, organization, activity, hours, cumulative_hours";

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_volunteer")
    .select(VOL_SELECT)
    .eq("student_id", ctx.recordStudentId)
    .order("grade", { ascending: true })
    .order("id", { ascending: true });

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

  const parsed = volunteerPostSchema.safeParse(body);
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
    period: p.period,
    organization: p.organization,
    activity: p.activity,
    hours: p.hours,
    cumulative_hours: null as number | null,
  };

  const { data: inserted, error: insErr } = await ctx.supabase
    .from("student_volunteer")
    .insert(row)
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: insErr.message } },
      { status: 500 },
    );
  }

  const recalc = await recalculateVolunteerCumulative(ctx.supabase, ctx.recordStudentId);
  if (!recalc.ok) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: recalc.message } },
      { status: 500 },
    );
  }

  const { data: item, error: fetchErr } = await ctx.supabase
    .from("student_volunteer")
    .select(VOL_SELECT)
    .eq("id", inserted.id)
    .eq("student_id", ctx.recordStudentId)
    .single();

  if (fetchErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: fetchErr.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item }, error: null }, { status: 201 });
}
