import Link from "next/link";
import { redirect } from "next/navigation";

import { TodoList } from "@/components/calendar/TodoList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { aggregateAdmissionTodosFromCalendarEvents } from "@/lib/calculators/calcAdmissionTodos";
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

  let dashboardTodos = aggregateAdmissionTodosFromCalendarEvents([]);
  if (!rpcResult.error) {
    const { data: calRows } = await supabase
      .from("calendar_events")
      .select("id, title, event_date, event_type")
      .eq("student_id", user.id)
      .order("event_date", { ascending: true })
      .order("title", { ascending: true });
    dashboardTodos = aggregateAdmissionTodosFromCalendarEvents(
      (calRows ?? []) as Pick<CalendarEventRow, "id" | "title" | "event_date" | "event_type">[],
    );
  }

  const dashboardTodoPreview = dashboardTodos.slice(0, 12);

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
              캘린더 일정 기준 역산 TO-DO(원서접수·수능·정시) ·{" "}
              <Link href="/dashboard/calendar" className="text-primary underline">
                입시 캘린더
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TodoList
              items={dashboardTodoPreview}
              showHeading={false}
              numbered
              className="border-0 p-0"
            />
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

          <Link href="/dashboard/subject-analysis" className="block">
            <Card>
              <CardHeader>
                <CardTitle>선택과목 분석</CardTitle>
                <CardDescription>
                  수능 선택과목·지원 가능 필터·정시 반영비 유불리
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

          <Link href="/dashboard/nulsul" className="block">
            <Card>
              <CardHeader>
                <CardTitle>논술 경쟁률 판독기</CardTitle>
                <CardDescription>
                  논술전형 명목 대비 실질 경쟁률·차이율 (수능최저·결시율 반영, P1-3)
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/explore" className="block">
            <Card>
              <CardHeader>
                <CardTitle>전국 대학 탐색</CardTitle>
                <CardDescription>
                  전형·지역·수능최저·면접 조건으로 199개 대학 필터 (§6)
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/simulator" className="block">
            <Card>
              <CardHeader>
                <CardTitle>원서 배분 시뮬레이터</CardTitle>
                <CardDescription>
                  수시 6장 구성·포트폴리오 경고·수시 납치 리스크 (§9)
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/dashboard/chat" className="block">
            <Card>
              <CardHeader>
                <CardTitle>AI 요강 챗봇</CardTitle>
                <CardDescription>전형계획·정시 자료 RAG 질의응답</CardDescription>
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
