import { NextResponse, type NextRequest } from "next/server";

import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import {
  calendarEventInsertSchema,
  type CalendarEventInsertInput,
} from "@/lib/calendar/calendarZod";
import { createClient, getAuthUser } from "@/lib/supabase/server";

async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: row, error } = await supabase
    .from("students")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
        { status: 500 },
      ),
    };
  }

  if (row?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          data: null,
          error: { code: "FORBIDDEN", message: "관리자만 일정을 추가할 수 있습니다." },
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

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

  return NextResponse.json({
    data: { items: (data ?? []) as CalendarEventRow[] },
    error: null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const admin = await requireAdmin(supabase, user.id);
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = calendarEventInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "입력값을 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const payload: CalendarEventInsertInput = parsed.data;
  const insertRow = {
    student_id: user.id,
    title: payload.title,
    event_date: payload.event_date,
    event_type: payload.event_type,
    university:
      payload.university != null && String(payload.university).trim() !== ""
        ? String(payload.university).trim()
        : null,
    alert_days: payload.alert_days,
    note:
      payload.note != null && String(payload.note).trim() !== ""
        ? String(payload.note).trim()
        : null,
  };

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(insertRow)
    .select(
      "id, student_id, title, event_date, event_type, university, alert_days, note, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      data: { item: data as CalendarEventRow },
      error: null,
    },
    { status: 201 },
  );
}
