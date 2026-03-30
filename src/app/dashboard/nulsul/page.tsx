import Link from "next/link";
import { redirect } from "next/navigation";

import { CalcBasis } from "@/components/common/CalcBasis";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { NulsulDashboardClient } from "./NulsulDashboardClient";

export default async function NulsulPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              논술 경쟁률 판독기
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/nulsul — P1-3 실질 경쟁률 (명목 × 수능최저 충족률 × (1 − 결시율))
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <DisclaimerBanner variant="calculation" />
        <CalcBasis
          dataSource="대학별 논술전형 경쟁률 자료"
          formula="실질경쟁률 = 명목경쟁률 × 수능최저충족률 × (1-결시율)"
        />
        <NulsulDashboardClient defaultYear={2026} />
      </div>
    </div>
  );
}
