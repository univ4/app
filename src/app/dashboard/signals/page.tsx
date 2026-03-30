import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CalcBasis } from "@/components/common/CalcBasis";
import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { SignalsClient } from "./SignalsClient";

export const metadata: Metadata = { title: "합격 가능성 신호등" };

export default async function SignalsPage() {
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
    <div className="min-h-screen bg-background p-4 sm:p-6" data-testid="signals-page">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <PageHeader
          title="합격 가능성 신호등"
          description="/dashboard/signals — P0-4 · P1-17 (Track 1 컷 대비 확률 %)"
          helpHref="/dashboard/help#signals"
        />
        {dataUpdatedLabel ? (
          <p className="text-caption">데이터 기준: {dataUpdatedLabel}</p>
        ) : null}

        <DisclaimerBanner variant="calculation" />
        <CalcBasis
          dataSource="대학별 입학전형 시행계획 및 입결 자료"
          formula="내 점수와 입결 컷오프(70%컷) 비교: ±5점(정시), ±0.3등급(교과)"
          year={2027}
        />
        <Card>
          <CardContent className="p-4 sm:p-6">
            <SignalsClient studentId={user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
