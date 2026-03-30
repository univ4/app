import Link from "next/link";
import { redirect } from "next/navigation";

import { CalcBasis } from "@/components/common/CalcBasis";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { PlacementTableView } from "@/components/placement-table/PlacementTableView";
import { createClient } from "@/lib/supabase/server";

export default async function PlacementTablePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: latestAdmissionRecord } = await supabase
    .from("admission_records")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dataUpdatedLabel = latestAdmissionRecord?.created_at
    ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(
        new Date(latestAdmissionRecord.created_at),
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              정시 배치표
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/placement-table — P2-12 · 입결 컷 대비 안정·적정·도전 (±5점)
            </p>
            {dataUpdatedLabel ? (
              <p className="text-muted-foreground text-xs">데이터 기준: {dataUpdatedLabel}</p>
            ) : null}
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <DisclaimerBanner variant="calculation" />
        <CalcBasis
          dataSource="대학별 정시 입결 자료"
          formula="수능 환산점수와 70%컷 컷오프 비교"
          year={2027}
        />
        <PlacementTableView />
      </div>
    </div>
  );
}
