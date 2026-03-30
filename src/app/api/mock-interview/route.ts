import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { InterviewType, MockInterviewRow } from "@/types/mockInterview";

const postSchema = z.object({
  targetUniv: z.string().min(1).max(120),
  interviewType: z.enum(["서류기반", "MMI", "교직인적성"]),
  question: z.string().min(1).max(50000),
  answer: z.string().max(50000).optional().nullable(),
  feedback: z.string().max(50000).optional().nullable(),
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
    .from("mock_interviews")
    .select(
      "id, student_id, target_univ, interview_type, question, answer, feedback, created_at",
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { items: (data ?? []) as MockInterviewRow[] },
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
    target_univ: parsed.data.targetUniv.trim(),
    interview_type: parsed.data.interviewType as InterviewType,
    question: parsed.data.question.trim(),
    answer:
      parsed.data.answer != null && String(parsed.data.answer).trim().length > 0
        ? String(parsed.data.answer).trim()
        : null,
    feedback:
      parsed.data.feedback != null && String(parsed.data.feedback).trim().length > 0
        ? String(parsed.data.feedback).trim()
        : null,
  };

  const { data, error } = await supabase
    .from("mock_interviews")
    .insert(row)
    .select(
      "id, student_id, target_univ, interview_type, question, answer, feedback, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: { item: data as MockInterviewRow }, error: null },
    { status: 201 },
  );
}
