import Link from "next/link";
import { redirect } from "next/navigation";

import { RecordCheckResult } from "@/components/record-check/RecordCheckResult";
import { RecordCheckSummary } from "@/components/record-check/RecordCheckSummary";
import { Button } from "@/components/ui/button";
import { loadRecordGapAnalysisForStudent } from "@/lib/record-check/recordGapFromDb";
import {
  resolveRecordStudentId,
  type AppStudentRole,
} from "@/lib/student-record/recordStudentContext";
import { createClient } from "@/lib/supabase/server";

export default async function RecordCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ student_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("students")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: AppStudentRole = me?.role === "admin" ? "admin" : "viewer";
  const sp = await searchParams;
  const recordStudentId = resolveRecordStudentId(user.id, role, sp.student_id);

  const loaded = await loadRecordGapAnalysisForStudent(supabase, recordStudentId);
  if (!loaded.ok) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="text-sm text-destructive">데이터를 불러오지 못했습니다: {loaded.message}</p>
          <Button asChild variant="outline">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { data, targetUnivType } = loaded;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">생기부 점검</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              세특·창체·수상·행동특성 입력 현황을 점검합니다.
            </p>
            {role === "admin" && recordStudentId !== user.id ? (
              <p className="mt-1 text-xs text-muted-foreground">
                대상 학생 ID: <span className="font-mono">{recordStudentId}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">대시보드</Link>
            </Button>
            <Button asChild variant="default">
              <Link href="/dashboard/student-record">생활기록부 입력</Link>
            </Button>
          </div>
        </div>

        <RecordCheckSummary criticalCount={data.criticalCount} targetUnivType={targetUnivType} />

        <RecordCheckResult items={data.items} overallScore={data.overallScore} />
      </div>
    </div>
  );
}
