import type { SupabaseClient } from "@supabase/supabase-js";

export async function recalculateVolunteerCumulative(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: rows, error } = await supabase
    .from("student_volunteer")
    .select("id, hours")
    .eq("student_id", studentId)
    .order("grade", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  let sum = 0;
  for (const r of rows ?? []) {
    sum += typeof r.hours === "number" ? r.hours : 0;
    const { error: uerr } = await supabase
      .from("student_volunteer")
      .update({ cumulative_hours: sum })
      .eq("id", r.id)
      .eq("student_id", studentId);
    if (uerr) {
      return { ok: false, message: uerr.message };
    }
  }

  return { ok: true };
}
