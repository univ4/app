import Link from "next/link";
import { redirect } from "next/navigation";

import { CalcBasis } from "@/components/common/CalcBasis";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { SignalsClient } from "./SignalsClient";

export default async function SignalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              합격 가능성 신호등
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/signals — P0-4 · P1-17 (Track 1 컷 대비 확률 %)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <DisclaimerBanner variant="calculation" />
        <CalcBasis
          dataSource="대학별 입학전형 시행계획 및 입결 자료"
          formula="내 점수와 입결 컷오프(70%컷) 비교: ±5점(정시), ±0.3등급(교과)"
          year={2027}
        />
        <SignalsClient studentId={user.id} />
      </div>
    </div>
  );
}
