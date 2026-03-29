import { addDays, format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { calcDDay } from "@/lib/calculators/calcDDay";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  async function logout() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: student }, rpcResult, subjectNoteCountRes] = await Promise.all([
    supabase.from("students").select("name").eq("id", user.id).maybeSingle(),
    supabase.rpc("ensure_default_admission_calendar_2027"),
    supabase
      .from("student_subject_notes")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id),
  ]);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekEndStr = format(addDays(today, 7), "yyyy-MM-dd");

  let weekCalendarItems: { title: string; event_date: string }[] = [];
  if (!rpcResult.error) {
    const { data: weekRows } = await supabase
      .from("calendar_events")
      .select("title, event_date")
      .eq("student_id", user.id)
      .gte("event_date", todayStr)
      .lte("event_date", weekEndStr)
      .order("event_date", { ascending: true })
      .limit(10);
    weekCalendarItems = weekRows ?? [];
  }

  const email = user.email ?? "사용자";
  const emailLocalPart = email.includes("@") ? email.split("@")[0] : email;
  const greetingName = student?.name?.trim() || emailLocalPart;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
            안녕하세요, {greetingName}님
          </h1>
          <form action={logout} className="shrink-0">
            <Button type="submit" className="w-full px-4 sm:w-auto">
              로그아웃
            </Button>
          </form>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>이번 주 할 일</CardTitle>
            <CardDescription>
              오늘부터 7일 이내 캘린더 일정 ·{" "}
              <Link href="/dashboard/calendar" className="text-primary underline">
                입시 캘린더
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weekCalendarItems.length > 0 ? (
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {weekCalendarItems.map((row) => (
                  <li key={`${row.event_date}-${row.title}`}>
                    <span className="font-mono text-muted-foreground">
                      {calcDDay(row.event_date).label}
                    </span>{" "}
                    {row.title}{" "}
                    <span className="text-muted-foreground">({row.event_date})</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>수능최저 기준 과목별 목표 등급 재확인</li>
                <li>지원 대학 최종 6장 결정</li>
                <li>자기소개서 초안 완성</li>
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/dashboard/scores" className="block">
            <Card>
              <CardHeader>
                <CardTitle>성적 관리</CardTitle>
                <CardDescription>
                  모의고사 및 내신 성적 입력 및 추이 확인
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/analysis" className="block">
            <Card>
              <CardHeader>
                <CardTitle>합격 가능성</CardTitle>
                <CardDescription>
                  서성한 이공계 합격 가능성 분석
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/signals" className="block">
            <Card>
              <CardHeader>
                <CardTitle>합격 신호등</CardTitle>
                <CardDescription>
                  199개 대학 입결 대비 안정·적정·도전 및 확률 %
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/chat" className="block">
            <Card>
              <CardHeader>
                <CardTitle>AI 요강 챗봇</CardTitle>
                <CardDescription>대학 요강 질의응답</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/calendar" className="block">
            <Card>
              <CardHeader>
                <CardTitle>입시 캘린더</CardTitle>
                <CardDescription>D-Day · 월별 보기 · 일정 관리(관리자)</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/student-record" className="block">
            <Card>
              <CardHeader>
                <CardTitle>생활기록부</CardTitle>
                <CardDescription>
                  세특·창체·수상·행동특성 · 세특 입력 과목{" "}
                  <span className="font-medium text-foreground">
                    {subjectNoteCountRes.count ?? 0}
                  </span>
                  개
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
