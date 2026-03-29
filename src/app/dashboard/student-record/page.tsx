import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  resolveRecordStudentId,
  type AppStudentRole,
} from "@/lib/student-record/recordStudentContext";
import { createClient } from "@/lib/supabase/server";

import { StudentRecordPageClient } from "./StudentRecordPageClient";

export default async function StudentRecordPage({
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto mb-4 flex min-w-0 max-w-5xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
            생활기록부
          </h1>
          {role === "admin" && recordStudentId !== user.id ? (
            <p className="text-xs text-muted-foreground">
              대상 학생 ID: <span className="font-mono">{recordStudentId}</span> (
              <code className="rounded bg-muted px-1">?student_id=</code> 쿼리)
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="hidden px-4 sm:inline-flex">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>
      </div>

      <StudentRecordPageClient recordStudentId={recordStudentId} isAdmin={role === "admin"} />
    </div>
  );
}
