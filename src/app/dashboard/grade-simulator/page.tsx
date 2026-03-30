import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GradeSimulatorClient } from "@/components/grade-simulator/GradeSimulatorClient";
import { createClient } from "@/lib/supabase/server";

export default async function GradeSimulatorPage() {
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
              성적 예측 시뮬레이터
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/grade-simulator — P2-5 · 목표 등급에 따른 내신 평균·신호등 변화
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <GradeSimulatorClient />
      </div>
    </div>
  );
}
