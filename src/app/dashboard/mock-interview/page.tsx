import Link from "next/link";
import { redirect } from "next/navigation";

import { DisclaimerBanner } from "@/components/common/DisclaimerBanner";
import { MockInterviewView } from "@/components/mock-interview/MockInterviewView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function MockInterviewPage() {
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
              AI 모의 면접 코치
            </h1>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              P1-9 · 생기부·전형계획 기반 질문 생성·답변 피드백 (`/api/mock-interview/*`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <div className="mb-6">
          <DisclaimerBanner variant="ai" />
        </div>
        <MockInterviewView />
      </div>
    </div>
  );
}
