import type { SupabaseClient } from "@supabase/supabase-js";

import {
  calcRecordGapAnalysis,
  type CalcRecordGapAnalysisResult,
  type RecordGapTargetUnivType,
} from "@/lib/calculators/calcRecordGapAnalysis";

export function inferTargetUnivType(
  targetMajor: string | null | undefined,
): RecordGapTargetUnivType {
  const m = (targetMajor ?? "").trim();
  if (!m) return "any";
  if (/자연|이공|공학|수의|약학|의예|의학|간호/.test(m)) return "science";
  if (/인문|사회|어문|국어국문|역사|법학|경영/.test(m)) return "liberal";
  return "any";
}

export async function loadRecordGapAnalysisForStudent(
  supabase: SupabaseClient,
  recordStudentId: string,
): Promise<
  | { ok: true; data: CalcRecordGapAnalysisResult; targetUnivType: RecordGapTargetUnivType }
  | { ok: false; message: string }
> {
  const [studentRes, notesRes, actRes, awardsRes, behRes] = await Promise.all([
    supabase.from("students").select("target_major").eq("id", recordStudentId).maybeSingle(),
    supabase
      .from("student_subject_notes")
      .select("subject_name, note, grade")
      .eq("student_id", recordStudentId)
      .order("grade", { ascending: true })
      .order("semester", { ascending: true })
      .order("subject_name", { ascending: true }),
    supabase
      .from("student_activities")
      .select("activity_type, hours, content, grade")
      .eq("student_id", recordStudentId),
    supabase.from("student_awards").select("award_name, grade").eq("student_id", recordStudentId),
    supabase
      .from("student_behavior")
      .select("content, grade")
      .eq("student_id", recordStudentId)
      .order("grade", { ascending: true }),
  ]);

  const firstErr =
    studentRes.error ?? notesRes.error ?? actRes.error ?? awardsRes.error ?? behRes.error;
  if (firstErr) {
    return { ok: false, message: firstErr.message };
  }

  const targetUnivType = inferTargetUnivType(studentRes.data?.target_major);

  const data = calcRecordGapAnalysis({
    subjectNotes: (notesRes.data ?? []).map((r) => ({
      subjectName: String(r.subject_name ?? ""),
      note: String(r.note ?? ""),
      grade: Number(r.grade),
    })),
    activities: (actRes.data ?? []).map((r) => ({
      activityType: String(r.activity_type ?? ""),
      hours: typeof r.hours === "number" ? r.hours : 0,
      content: String(r.content ?? ""),
      grade: Number(r.grade),
    })),
    awards: (awardsRes.data ?? []).map((r) => ({
      awardName: String(r.award_name ?? ""),
      grade: Number(r.grade),
    })),
    behavior: (behRes.data ?? []).map((r) => ({
      content: String(r.content ?? ""),
      grade: Number(r.grade),
    })),
    targetUnivType,
  });

  return { ok: true, data, targetUnivType };
}
