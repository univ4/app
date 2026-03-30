import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/common/PageHeader";
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
    <div className="min-h-screen bg-background p-4 sm:p-6" data-testid="student-record-page">
      <div className="mx-auto mb-4 min-w-0 max-w-5xl">
        <PageHeader
          title="생활기록부"
          description={
            role === "admin" && recordStudentId !== user.id
              ? `대상 학생 ID: ${recordStudentId} (?student_id= 쿼리)`
              : "세특·창체·수상·출결 데이터를 입력하고 관리합니다."
          }
          rightSlot={
            role === "admin" && recordStudentId !== user.id ? (
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard/student-record">내 계정으로 보기</Link>
              </Button>
            ) : undefined
          }
        />
      </div>

      <StudentRecordPageClient recordStudentId={recordStudentId} isAdmin={role === "admin"} />
    </div>
  );
}
