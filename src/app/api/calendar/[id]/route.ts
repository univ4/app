import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { calendarEventUpdateSchema } from "@/lib/calendar/calendarZod";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const idParamSchema = z.string().uuid();

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
          error: { code: "FORBIDDEN", message: "관리자만 일정을 수정·삭제할 수 있습니다." },
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "유효한 id가 아닙니다." } },
      { status: 422 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = calendarEventUpdateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "수정할 필드를 한 개 이상 보내 주세요." },
      },
      { status: 422 },
    );
  }

  const raw = parsed.data;
  const patch = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
  if ("university" in patch) {
    const u = patch.university;
    patch.university =
      u != null && String(u).trim() !== "" ? String(u).trim() : null;
  }
  if ("note" in patch) {
    const n = patch.note;
    patch.note = n != null && String(n).trim() !== "" ? String(n).trim() : null;
  }
  const { data, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", idParsed.data)
    .eq("student_id", user.id)
    .select(
      "id, student_id, title, event_date, event_type, university, alert_days, note, created_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "일정을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { item: data as CalendarEventRow },
    error: null,
  });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "유효한 id가 아닙니다." } },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", idParsed.data)
    .eq("student_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "일정을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { deleted_id: data.id },
    error: null,
  });
}
