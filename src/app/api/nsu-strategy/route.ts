import { NextResponse } from "next/server";
import { z } from "zod";

import { calcNsuStrategy } from "@/lib/calculators/calcNsuStrategy";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  nsuYear: z.number().int().min(1).max(8),
  suneungScore: z.number().finite().optional(),
  prevScore: z.number().finite().optional(),
  gpa: z.number().finite().optional(),
  targetType: z.enum(["jeongsi", "susi", "both"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 올바르지 않습니다." } },
      { status: 422 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "요청 값이 올바르지 않습니다.";
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: msg } },
      { status: 422 },
    );
  }

  const strategy = calcNsuStrategy(parsed.data);

  return NextResponse.json({
    data: { strategy },
    error: null,
  });
}
