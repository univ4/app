import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
import { createClient } from "@/lib/supabase/server";

import { ExploreClient } from "./ExploreClient";

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <PageHeader
          title="전국 대학 지원 가능 탐색기"
          description="/dashboard/explore — P1-15 · P1-16 (입결 스캔·조건부 필터)"
        />

        <ExploreClient studentId={user.id} />
      </div>
    </div>
  );
}
