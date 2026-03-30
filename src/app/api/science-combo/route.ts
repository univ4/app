import { NextResponse } from "next/server";
import { z } from "zod";

import { calcScienceComboSimulator } from "@/lib/calculators/calcScienceComboSimulator";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  science1: z.string().min(1, "탐구1 과목을 선택하세요."),
  science2: z.string().min(1, "탐구2 과목을 선택하세요."),
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
    const msg = parsed.error.flatten().fieldErrors.science1?.[0]
      ?? parsed.error.flatten().fieldErrors.science2?.[0]
      ?? "요청 값이 올바르지 않습니다.";
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: msg } },
      { status: 422 },
    );
  }

  const { data: rows, error } = await supabase
    .from("university_scoring_rules")
    .select("university_name, math_ratio, science_2_bonus, admission_year")
    .eq("major_group", "자연계열");

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const latestByUniv = new Map<
    string,
    { math_ratio: number; science_2_bonus: number; admission_year: number }
  >();
  for (const raw of rows ?? []) {
    const university_name = String(raw.university_name ?? "");
    const math_ratio = Number(raw.math_ratio);
    const science_2_bonus = Number(raw.science_2_bonus ?? 0);
    const admission_year = Number(raw.admission_year ?? 0);
    if (!university_name || Number.isNaN(math_ratio)) continue;
    const prev = latestByUniv.get(university_name);
    if (!prev || admission_year > prev.admission_year) {
      latestByUniv.set(university_name, { math_ratio, science_2_bonus, admission_year });
    }
  }

  const scoringRules = [...latestByUniv.entries()].map(([univName, v]) => ({
    univName,
    science2Bonus: v.science_2_bonus,
    mathRatio: v.math_ratio,
  }));

  const result = calcScienceComboSimulator({
    combo: {
      science1: parsed.data.science1.trim(),
      science2: parsed.data.science2.trim(),
    },
    scoringRules,
  });

  return NextResponse.json({ data: { result }, error: null });
}
