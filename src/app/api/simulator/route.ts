import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";

const signalEnum = z.enum(["safe", "moderate", "challenge"]);

const portfolioCardSchema = z.object({
  university: z.string().min(1),
  department: z.string().min(1),
  admissionType: z.string().min(1),
  signal: signalEnum,
  hasSuneungMinimum: z.boolean(),
  admissionRecordId: z.number().int().positive().optional(),
});

const postBodySchema = z.object({
  cards: z.array(portfolioCardSchema).max(6),
});

export async function GET(_request: NextRequest) {
  void _request;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("simulator_portfolios")
    .select("id, student_id, cards, created_at")
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { portfolio: data },
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "cards(최대 6장) 형식을 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("simulator_portfolios")
    .upsert(
      {
        student_id: user.id,
        cards: parsed.data.cards,
      },
      { onConflict: "student_id" },
    )
    .select("id, student_id, cards, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: { portfolio: data },
    error: null,
  });
}
