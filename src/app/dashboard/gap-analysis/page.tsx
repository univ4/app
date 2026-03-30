import Link from "next/link";
import { redirect } from "next/navigation";

import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { GapAnalysisView } from "@/components/gap-analysis/GapAnalysisView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function GapAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-3xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              세특 Gap 분석
            </h1>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              P1-4 · 세특·전형계획 RAG 기반 강점·보완·액션 플랜 (`/api/student-record/gap-analysis`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <div className="mb-6">
          <DisclaimerBanner variant="ai" />
        </div>
        <GapAnalysisView />
      </div>
    </div>
  );
}
