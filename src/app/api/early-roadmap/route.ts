import { NextResponse } from "next/server";
import { z } from "zod";

import { calcEarlyRoadmap } from "@/lib/calculators/calcEarlyRoadmap";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  currentGrade: z.union([z.literal(1), z.literal(2)]),
  currentSemester: z.union([z.literal(1), z.literal(2)]),
  targetUnivType: z.enum(["top", "mid", "local"]),
  targetDept: z.enum(["science", "liberal", "art"]),
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

  const { phases, keyMilestones, summary } = calcEarlyRoadmap(parsed.data);

  return NextResponse.json({
    data: { phases, keyMilestones, summary },
    error: null,
  });
}
