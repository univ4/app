import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { SUBJECT_YEAR } from "@/types/subject";

const profileBodySchema = z.object({
  korean_subject: z.enum(["언어와매체", "화법과작문"] as const),
  math_subject: z.enum(["미적분", "기하", "확률과통계"] as const),
  science1: z.string().nullable().optional(),
  science2: z.string().nullable().optional(),
  social1: z.string().nullable().optional(),
  social2: z.string().nullable().optional(),
  second_foreign: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 올바르지 않습니다." } },
      { status: 422 },
    );
  }

  const parsed = profileBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.flatten().formErrors.join("; ") || "입력값이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

  const p = parsed.data;
  const upsertRow = {
    student_id: user.id,
    year: SUBJECT_YEAR,
    korean_subject: p.korean_subject,
    math_subject: p.math_subject,
    science1: p.science1 ?? null,
    science2: p.science2 ?? null,
    social1: p.social1 ?? null,
    social2: p.social2 ?? null,
    second_foreign: p.second_foreign ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("subject_profiles")
    .upsert(upsertRow, { onConflict: "student_id,year" })
    .select("id, student_id, year, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      id: data.id,
      student_id: data.student_id,
      year: data.year,
      updated_at: data.updated_at,
    },
    error: null,
  });
}
