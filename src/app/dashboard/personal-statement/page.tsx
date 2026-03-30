import Link from "next/link";
import { redirect } from "next/navigation";

import { PersonalStatementCoach } from "@/components/personal-statement/PersonalStatementCoach";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function PersonalStatementPage() {
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
              자소서 코치
            </h1>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              P1-6 · 생기부 근거 피드백 · 글자수 확인 · 역량별 코멘트 (`/api/personal-statement/feedback`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <PersonalStatementCoach />
      </div>
    </div>
  );
}
