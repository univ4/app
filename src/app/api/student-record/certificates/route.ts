import { NextResponse } from "next/server";

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";
import { certificatePostSchema } from "@/lib/student-record/studentRecordZod";

const CERT_SELECT =
  "id, student_id, cert_type, cert_name, cert_number, acquired_date, issuer, created_at";

function normOpt(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function GET(request: Request) {
  const ctx = await getStudentRecordRequestContext(request);
  if (!ctx.ok) return ctx.response;

  const { data, error } = await ctx.supabase
    .from("student_certificates")
    .select(CERT_SELECT)
    .eq("student_id", ctx.recordStudentId)
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

  const parsed = certificatePostSchema.safeParse(body);
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
    cert_type: p.cert_type,
    cert_name: p.cert_name.trim(),
    cert_number: normOpt(p.cert_number ?? undefined),
    acquired_date: p.acquired_date === undefined ? null : p.acquired_date,
    issuer: normOpt(p.issuer ?? undefined),
  };

  const { data, error } = await ctx.supabase
    .from("student_certificates")
    .insert(row)
    .select(CERT_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { item: data }, error: null }, { status: 201 });
}
