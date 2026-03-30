import Link from "next/link";
import { redirect } from "next/navigation";

import { HakjongAnalysisView } from "@/components/hakjong/HakjongAnalysisView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HakjongAnalysisPage() {
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
              학종 역량 분석
            </h1>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              P1-5 · 생활기록부 청크 기반 학업·진로·공동체 역량 분석 (`/api/student-record/analyze`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <HakjongAnalysisView />
      </div>
    </div>
  );
}
