import Link from "next/link";
import { redirect } from "next/navigation";

import { ExamAnalysisView } from "@/components/exam-analysis/ExamAnalysisView";
import { Button } from "@/components/ui/button";
import { getExamChunksSummary } from "@/lib/exam-analysis/getExamChunksSummary";
import { createClient } from "@/lib/supabase/server";

export default async function ExamAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: summary, error } = await getExamChunksSummary(supabase);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              논술·면접 기출 분석
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/exam-analysis — P2-4 · 기출 청크 RAG (`exam_chunks`)
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <ExamAnalysisView
          initialSummary={summary}
          summaryError={error?.message ?? null}
        />
      </div>
    </div>
  );
}
