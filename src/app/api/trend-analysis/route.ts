import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { calcAdmissionTrend } from "@/lib/calculators/calcAdmissionTrend";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const querySchema = z.object({
  univName: z.string().trim().min(1, "univName is required"),
  deptName: z.string().trim().min(1, "deptName is required"),
  admissionType: z.enum(["학생부교과", "학생부종합", "논술전형", "정시"]),
});

type DbRow = {
  year: number;
  cutoff_score: number | null;
  competition_ratio: number | null;
};

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
    univName: url.searchParams.get("univName") ?? "",
    deptName: url.searchParams.get("deptName") ?? "",
    admissionType: url.searchParams.get("admissionType") ?? "",
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

  const { univName, deptName, admissionType } = parsed.data;

  const { data: rows, error } = await supabase
    .from("admission_records")
    .select("year, cutoff_score, competition_ratio")
    .eq("univ_name", univName)
    .eq("dept_name", deptName)
    .eq("admission_type", admissionType)
    .order("year", { ascending: true });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const dbRows = (rows ?? []) as DbRow[];

  const records = dbRows
    .filter((r) => r.cutoff_score != null && Number.isFinite(Number(r.cutoff_score)))
    .map((r) => ({
      year: r.year,
      cutoffScore: Number(r.cutoff_score),
      competitionRatio: r.competition_ratio != null && Number.isFinite(Number(r.competition_ratio))
        ? Number(r.competition_ratio)
        : 0,
    }));

  const trend = calcAdmissionTrend({ records, deptName });

  return NextResponse.json({
    data: {
      records,
      trend,
    },
    error: null,
  });
}
