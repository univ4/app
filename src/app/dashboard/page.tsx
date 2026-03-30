import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { OnboardingGuide } from "@/components/dashboard/OnboardingGuide";
import { DASHBOARD_CORE_CARDS } from "@/components/dashboard/dashboardMenu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
} from "@/components/ui/card";
import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
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

  const [{ data: student }, rpcResult, subjectNoteCountRes, scoreCountRes] = await Promise.all([
    supabase.from("students").select("name").eq("id", user.id).maybeSingle(),
    supabase.rpc("ensure_default_admission_calendar_2027"),
    supabase
      .from("student_subject_notes")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id),
    supabase
      .from("academic_records")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id),
  ]);

  let calendarRows: Pick<CalendarEventRow, "id" | "title" | "event_date" | "event_type">[] = [];
  if (!rpcResult.error) {
    const { data: calRows } = await supabase
      .from("calendar_events")
      .select("id, title, event_date, event_type")
      .eq("student_id", user.id)
      .order("event_date", { ascending: true })
      .order("title", { ascending: true });
    calendarRows = (calRows ?? []) as Pick<CalendarEventRow, "id" | "title" | "event_date" | "event_type">[];
  }

  const email = user.email ?? "사용자";
  const emailLocalPart = email.includes("@") ? email.split("@")[0] : email;
  const greetingName = student?.name?.trim() || emailLocalPart;
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
  const nearestEvent = calendarRows
    .map((row) => ({
      ...row,
      dday: calcDDay(row.event_date),
    }))
    .filter((row) => row.dday.dday >= 0)
    .sort((a, b) => a.dday.dday - b.dday.dday)[0];
  const hasScores = (scoreCountRes.count ?? 0) > 0;
  const hasStudentRecord = (subjectNoteCountRes.count ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold text-foreground sm:text-2xl">
              안녕하세요, {greetingName}님
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {todayLabel}
              {nearestEvent ? ` · ${nearestEvent.title} ${nearestEvent.dday.label}` : ""}
            </p>
          </div>
          <form action={logout} className="shrink-0">
            <Button type="submit" variant="outline" className="w-full px-4 sm:w-auto">
              로그아웃
            </Button>
          </form>
        </div>

        <div className="mb-4">
          <OnboardingGuide
            hasScores={hasScores}
            hasStudentRecord={hasStudentRecord}
            hasSignalsReady={hasScores}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {DASHBOARD_CORE_CARDS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="h-36 border-border transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                  <CardHeader className="h-full justify-between space-y-0 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-md bg-accent p-2 text-accent-foreground">
                        {Icon ? <Icon className="size-4" aria-hidden /> : null}
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground sm:text-base">{item.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{item.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
