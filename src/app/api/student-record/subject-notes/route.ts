import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { subjectNotePostSchema } from "@/lib/student-record/studentRecordZod";

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { supabase, recordStudentId } = ctx;

  const { data, error } = await supabase
    .from("student_subject_notes")
    .select("id, student_id, grade, semester, subject_name, note")
    .eq("student_id", recordStudentId)
    .order("grade", { ascending: true })
    .order("semester", { ascending: true })
    .order("subject_name", { ascending: true });

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

  const parsed = subjectNotePostSchema.safeParse(body);
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
    subject_name: parsed.data.subject_name,
    note: parsed.data.note,
  };

  const { data, error } = await ctx.supabase
    .from("student_subject_notes")
    .insert(row)
    .select("id, student_id, grade, semester, subject_name, note")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "CONFLICT",
            message: "동일 학년·학기·과목명이 이미 있습니다. 수정하거나 과목명을 바꿔 주세요.",
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
