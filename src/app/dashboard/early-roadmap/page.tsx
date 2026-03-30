import Link from "next/link";
import { redirect } from "next/navigation";

import { EarlyRoadmapClient } from "@/app/dashboard/early-roadmap/EarlyRoadmapClient";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function EarlyRoadmapPage() {
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
              조기 설계 로드맵
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/early-roadmap — 고1·고2 학기별 계획 (P3-3)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <EarlyRoadmapClient />
      </div>
    </div>
  );
}
