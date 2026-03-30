import Link from "next/link";
import { redirect } from "next/navigation";

import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { aggregateAdmissionTodosFromCalendarEvents } from "@/lib/calculators/calcAdmissionTodos";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error: rpcErr } = await supabase.rpc("ensure_default_admission_calendar_2027");
  if (rpcErr) {
    throw new Error(rpcErr.message);
  }

  const [{ data: student }, { data: rows, error: listErr }] = await Promise.all([
    supabase.from("students").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("calendar_events")
      .select(
        "id, student_id, title, event_date, event_type, university, alert_days, note, created_at",
      )
      .eq("student_id", user.id)
      .order("event_date", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (listErr) {
    throw new Error(listErr.message);
  }

  const initialItems = (rows ?? []) as CalendarEventRow[];
  const initialTodos = aggregateAdmissionTodosFromCalendarEvents(initialItems);
  const isAdmin = student?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground break-words sm:text-2xl">
              입시 D-Day 캘린더
            </h1>
            <p className="text-muted-foreground text-sm break-words">
              /dashboard/calendar — P0-5 · 2027학년도 기본 일정 및 가족 공유
            </p>
          </div>
          <Button asChild variant="outline" className="hidden w-full sm:inline-flex sm:w-auto">
            <Link href="/dashboard">대시보드</Link>
          </Button>
        </div>

        <CalendarPageClient
          initialItems={initialItems}
          initialTodos={initialTodos}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
