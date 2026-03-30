import Link from "next/link";
import { redirect } from "next/navigation";

import { JeongsiGunView } from "@/components/jeongsi-gun/JeongsiGunView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const ADMISSION_YEAR = 2026;

export default async function JeongsiGunPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("admission_records")
    .select("univ_name")
    .eq("year", ADMISSION_YEAR)
    .eq("admission_type", "정시")
    .not("cutoff_score", "is", null);

  const universities =
    error || !rows
      ? []
      : [...new Set(rows.map((r) => r.univ_name).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b, "ko"),
        );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              정시 군별 지원 전략
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/jeongsi-gun — P2-10 · 가·나·다군 조합 위험도·정시자료 RAG
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        {universities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {error
              ? `정시 입결 목록을 불러오지 못했습니다: ${error.message}`
              : `${ADMISSION_YEAR}학년도 정시 입결(admission_records)이 없습니다. 데이터 적재 후 다시 확인해 주세요.`}
          </p>
        ) : (
          <JeongsiGunView universities={universities} />
        )}
      </div>
    </div>
  );
}
