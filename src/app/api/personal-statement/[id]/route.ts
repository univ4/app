import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { PersonalStatementRow } from "@/types/personalStatement";

const putSchema = z.object({
  university: z.string().min(1).max(200).optional(),
  question_number: z.number().int().min(1).max(4).optional(),
  question_text: z.string().min(1).max(20000).optional(),
  draft_text: z.string().max(120000).optional(),
  max_length: z.number().int().min(100).max(20000).optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "유효한 id가 아닙니다." },
      },
      { status: 422 },
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

  const parsed = putSchema.safeParse(rawJson);
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

  const patch: Record<string, unknown> = {};
  if (parsed.data.university !== undefined) {
    patch.university = parsed.data.university.trim();
  }
  if (parsed.data.question_number !== undefined) {
    patch.question_number = parsed.data.question_number;
  }
  if (parsed.data.question_text !== undefined) {
    patch.question_text = parsed.data.question_text.trim();
  }
  if (parsed.data.draft_text !== undefined) {
    patch.draft_text = parsed.data.draft_text;
  }
  if (parsed.data.max_length !== undefined) {
    patch.max_length = parsed.data.max_length;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "수정할 필드가 없습니다." },
      },
      { status: 422 },
    );
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("personal_statements")
    .update(patch)
    .eq("id", idParse.data)
    .eq("student_id", user.id)
    .select(
      "id, student_id, university, question_number, question_text, draft_text, max_length, created_at, updated_at",
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
      { data: null, error: { code: "NOT_FOUND", message: "자소서를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { item: data as PersonalStatementRow },
    error: null,
  });
}
