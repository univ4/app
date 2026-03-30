/**
 * 검증 스크립트 공통: Supabase(service role) 연결·전체 행 페이징 조회
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getEnvUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  if (!url.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL 이 필요합니다.",
    );
  }
  return url.trim();
}

export function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return key.trim();
}

export function createServiceClient(): SupabaseClient {
  return createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PAGE_SIZE = 1000;

export async function fetchAllRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/** 목록 출력 시 과다 행 방지 */
export function formatSampleList(
  items: readonly string[],
  maxItems = 12,
): string {
  if (items.length === 0) return "샘플 없음";
  const slice = items.slice(0, maxItems);
  const more =
    items.length > maxItems ? ` … 외 ${items.length - maxItems}건` : "";
  return `${slice.join("; ")}${more}`;
}
