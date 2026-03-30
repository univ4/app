/**
 * student_record_chunks 데이터 품질 검증
 *
 * 실행: ./node_modules/.bin/tsx scripts/validate/validate_student_record_chunks.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceClient,
  fetchAllRows,
  formatSampleList,
} from "./_shared.js";

const ALLOWED_SECTIONS = new Set(["세특", "창체", "행동특성"]);

type StudentChunkRow = {
  id: number;
  student_id: string | null;
  chunk_text: string;
  embedding: unknown;
  metadata: Record<string, unknown> | null;
};

export type StudentChunkValidationResult = {
  totalRows: number;
  errorCount: number;
  warnCount: number;
  lines: string[];
};

function embeddingMissing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "string") return v.trim().length === 0;
  return false;
}

function sectionWarn(meta: Record<string, unknown> | null): boolean {
  if (!meta || !("section" in meta)) return true;
  const s = meta.section;
  if (s === null || s === undefined) return true;
  const t = typeof s === "string" ? s.trim() : String(s);
  return !ALLOWED_SECTIONS.has(t);
}

export async function validateStudentRecordChunks(
  supabase: SupabaseClient,
): Promise<StudentChunkValidationResult> {
  const rows = await fetchAllRows<StudentChunkRow>(
    supabase,
    "student_record_chunks",
    "id, student_id, chunk_text, embedding, metadata",
  );

  const shortSamples: string[] = [];
  const sectionSamples: string[] = [];

  let shortWarn = 0;
  let embedErr = 0;
  let studentErr = 0;
  let sectionBad = 0;

  const idLabel = (r: StudentChunkRow) =>
    `id=${r.id} student_id=${r.student_id ?? "null"}`;

  for (const r of rows) {
    const text = r.chunk_text ?? "";
    const len = [...text].length;

    if (len < 10) {
      shortWarn += 1;
      if (shortSamples.length < 20) shortSamples.push(idLabel(r));
    }

    if (embeddingMissing(r.embedding)) embedErr += 1;

    if (r.student_id === null || String(r.student_id).trim() === "") {
      studentErr += 1;
    }

    if (sectionWarn(r.metadata)) {
      sectionBad += 1;
      if (sectionSamples.length < 20) sectionSamples.push(idLabel(r));
    }
  }

  const warnCount = shortWarn + sectionBad;
  const errorCount = embedErr + studentErr;

  const lines: string[] = [
    `[PASS] student_record_chunks: ${rows.length}건 검증 완료`,
    `[WARN] chunk_text 10자 미만: ${shortWarn}건 (${formatSampleList(shortSamples)})`,
    `[ERROR] embedding 누락: ${embedErr}건`,
    `[WARN] metadata.section 세특/창체/행동특성 외 또는 누락: ${sectionBad}건 (${formatSampleList(sectionSamples)})`,
    `[ERROR] student_id null 또는 빈 값: ${studentErr}건`,
    `[SUMMARY] 오류: ${errorCount}건, 경고: ${warnCount}건`,
  ];

  return {
    totalRows: rows.length,
    errorCount,
    warnCount,
    lines,
  };
}

async function main(): Promise<void> {
  const supabase = createServiceClient();
  const result = await validateStudentRecordChunks(supabase);
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.errorCount > 0 ? 1 : 0;
}

const isMain = process.argv[1]?.includes("validate_student_record_chunks");

if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
