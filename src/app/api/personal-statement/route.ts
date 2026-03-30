import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { PersonalStatementRow } from "@/types/personalStatement";

const postSchema = z.object({
  university: z.string().min(1).max(200),
  question_number: z.number().int().min(1).max(4),
  question_text: z.string().min(1).max(20000),
  draft_text: z.string().max(120000).default(""),
  max_length: z.number().int().min(100).max(20000).optional().default(1500),
});

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("personal_statements")
    .select(
      "id, student_id, university, question_number, question_text, draft_text, max_length, created_at, updated_at",
    )
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { items: (data ?? []) as PersonalStatementRow[] },
    error: null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = postSchema.safeParse(rawJson);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: msg || "요청 형식이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

  const row = {
    student_id: user.id,
    university: parsed.data.university.trim(),
    question_number: parsed.data.question_number,
    question_text: parsed.data.question_text.trim(),
    draft_text: parsed.data.draft_text,
    max_length: parsed.data.max_length,
  };

  const { data, error } = await supabase
    .from("personal_statements")
    .insert(row)
    .select(
      "id, student_id, university, question_number, question_text, draft_text, max_length, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: { item: data as PersonalStatementRow }, error: null },
    { status: 201 },
  );
}
