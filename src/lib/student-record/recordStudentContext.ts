import { NextResponse } from "next/server";
import { z } from "zod";

import type { User } from "@supabase/supabase-js";

import { createClient, getAuthUser } from "@/lib/supabase/server";

const uuidSchema = z.string().uuid();

export type AppStudentRole = "admin" | "viewer";

export function resolveRecordStudentId(
  userId: string,
  role: AppStudentRole | null | undefined,
  paramStudentId: string | null | undefined,
): string {
  if (role === "admin" && paramStudentId) {
    const parsed = uuidSchema.safeParse(paramStudentId.trim());
    if (parsed.success) return parsed.data;
  }
  return userId;
}

export function recordStudentIdFromRequest(
  request: Request,
  userId: string,
  role: AppStudentRole | null | undefined,
): string {
  const url = new URL(request.url);
  const param = url.searchParams.get("student_id");
  return resolveRecordStudentId(userId, role, param);
}

export async function requireAdmin(
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
          error: { code: "FORBIDDEN", message: "관리자만 이 작업을 할 수 있습니다." },
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export async function getStudentRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<AppStudentRole> {
  const { data: row } = await supabase
    .from("students")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return row?.role === "admin" ? "admin" : "viewer";
}

export type StudentRecordRequestContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: User;
      role: AppStudentRole;
      recordStudentId: string;
    }
  | { ok: false; response: NextResponse };

export async function getStudentRecordRequestContext(
  request: Request,
): Promise<StudentRecordRequestContext> {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 },
      ),
    };
  }

  const role = await getStudentRole(supabase, user.id);
  const recordStudentId = recordStudentIdFromRequest(request, user.id, role);

  return {
    ok: true,
    supabase,
    user,
    role,
    recordStudentId,
  };
}
