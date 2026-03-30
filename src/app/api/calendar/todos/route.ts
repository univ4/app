import { NextResponse } from "next/server";

import { aggregateAdmissionTodosFromCalendarEvents } from "@/lib/calculators/calcAdmissionTodos";
import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const { error: rpcErr } = await supabase.rpc("ensure_default_admission_calendar_2027");
  if (rpcErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: rpcErr.message } },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, student_id, title, event_date, event_type, university, alert_days, note, created_at",
    )
    .eq("student_id", user.id)
    .order("event_date", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const items = (data ?? []) as CalendarEventRow[];
  const todos = aggregateAdmissionTodosFromCalendarEvents(items);

  return NextResponse.json({
    data: { todos },
    error: null,
  });
}
