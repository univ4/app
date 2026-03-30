import type { SupabaseClient } from "@supabase/supabase-js";

export type ExamChunksSummary = {
  total: number;
  univCount: number;
  univNames: string[];
  years: number[];
};

export async function getExamChunksSummary(
  supabase: SupabaseClient,
): Promise<{ data: ExamChunksSummary; error: { message: string } | null }> {
  const { count, error: countErr } = await supabase
    .from("exam_chunks")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    return {
      data: { total: 0, univCount: 0, univNames: [], years: [] },
      error: { message: countErr.message },
    };
  }

  const total = count ?? 0;
  if (total === 0) {
    return {
      data: { total: 0, univCount: 0, univNames: [], years: [] },
      error: null,
    };
  }

  const { data: rows, error: rowErr } = await supabase
    .from("exam_chunks")
    .select("univ_name, year");

  if (rowErr) {
    return {
      data: { total: 0, univCount: 0, univNames: [], years: [] },
      error: { message: rowErr.message },
    };
  }

  const univSet = new Set<string>();
  const yearSet = new Set<number>();
  for (const r of rows ?? []) {
    const row = r as { univ_name: string | null; year: number | null };
    if (row.univ_name) univSet.add(row.univ_name);
    if (typeof row.year === "number") yearSet.add(row.year);
  }

  return {
    data: {
      total,
      univCount: univSet.size,
      univNames: [...univSet].sort((a, b) => a.localeCompare(b, "ko")),
      years: [...yearSet].sort((a, b) => b - a),
    },
    error: null,
  };
}
