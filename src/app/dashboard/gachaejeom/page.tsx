import Link from "next/link";
import { redirect } from "next/navigation";

import { GachaejeomView } from "@/components/gachaejeom/GachaejeomView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function GachaejeomPage() {
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
              수능 가채점 환산 계산기
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/gachaejeom — P1-10 (Track 1 추정 + 정시 환산·신호등)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <GachaejeomView />
      </div>
    </div>
  );
}
