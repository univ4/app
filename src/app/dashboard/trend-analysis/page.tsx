import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TrendAnalysisClient } from "@/components/trend-analysis/TrendAnalysisClient";
import type { TrendFilterValue } from "@/components/trend-analysis/TrendFilter";
import { createClient } from "@/lib/supabase/server";

function buildFilterIndex(rows: { univ_name: string; dept_name: string }[]) {
  const deptByUniv: Record<string, Set<string>> = {};
  for (const r of rows) {
    const u = r.univ_name?.trim();
    const d = r.dept_name?.trim();
    if (!u || !d) continue;
    if (!deptByUniv[u]) deptByUniv[u] = new Set();
    deptByUniv[u]!.add(d);
  }
  const univOptions = Object.keys(deptByUniv).sort((a, b) => a.localeCompare(b, "ko"));
  const map: Record<string, string[]> = {};
  for (const u of univOptions) {
    map[u] = [...(deptByUniv[u] ?? [])];
  }
  return { univOptions, deptByUniv: map };
}

function defaultFilter(univOptions: string[], deptByUniv: Record<string, string[]>): TrendFilterValue {
  const firstUniv = univOptions[0] ?? "";
  const depts = firstUniv ? (deptByUniv[firstUniv] ?? []).sort((a, b) => a.localeCompare(b, "ko")) : [];
  const firstDept = depts[0] ?? "";
  return {
    univName: firstUniv,
    deptName: firstDept,
    admissionType: "정시",
  };
}

export default async function TrendAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pairs } = await supabase.from("admission_records").select("univ_name, dept_name");

  const { univOptions, deptByUniv } = buildFilterIndex((pairs ?? []) as { univ_name: string; dept_name: string }[]);
  const initialFilter = defaultFilter(univOptions, deptByUniv);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              입결 추이 분석
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/trend-analysis — P2-9 · 연도별 컷오프 추이
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        {univOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            입결 데이터가 없어 분석을 시작할 수 없습니다. `admission_records` 적재를 확인해 주세요.
          </p>
        ) : (
          <TrendAnalysisClient
            univOptions={univOptions}
            deptByUniv={deptByUniv}
            initialFilter={initialFilter}
          />
        )}
      </div>
    </div>
  );
}
