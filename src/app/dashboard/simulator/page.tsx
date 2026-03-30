import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { createClient } from "@/lib/supabase/server";

import { SimulatorClient } from "./SimulatorClient";

export const metadata: Metadata = { title: "원서 배분 시뮬레이터" };

export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        <PageHeader
          title="원서 배분 시뮬레이터"
          description="/dashboard/simulator — P1-7 · 매뉴얼 §9 (6장·신호등·납치 리스크)"
          helpHref="/dashboard/help#susi-strategy"
        />

        <SimulatorClient studentId={user.id} />
      </div>
    </div>
  );
}
