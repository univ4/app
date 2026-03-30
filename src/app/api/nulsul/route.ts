import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import type { NulsulAdmissionItem } from "@/lib/nulsul/types";

const querySchema = z.object({
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    admissionYear: url.searchParams.get("admissionYear") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "쿼리 파라미터를 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const admissionYear = parsed.data.admissionYear ?? 2026;

  const { data, error } = await supabase
    .from("admission_records")
    .select("id, univ_name, dept_name, admission_type, year, competition_ratio")
    .eq("admission_type", "논술전형")
    .eq("year", admissionYear)
    .order("univ_name", { ascending: true })
    .order("dept_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const items = (data ?? []) as NulsulAdmissionItem[];

  return NextResponse.json({
    data: {
      items,
      meta: { admission_year: admissionYear, row_count: items.length },
    },
    error: null,
  });
}
