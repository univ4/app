/**
 * guideline_chunks 데이터 품질 검증
 *
 * 실행: ./node_modules/.bin/tsx scripts/validate/validate_guideline_chunks.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceClient,
  fetchAllRows,
  formatSampleList,
} from "./_shared.js";

type GuidelineRow = {
  id: number;
  chunk_text: string;
  embedding: unknown;
  metadata: Record<string, unknown> | null;
};

export type GuidelineValidationResult = {
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

function metaString(
  m: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!m || !(key in m)) return null;
  const v = m[key];
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() === "" ? null : v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

function metaYearBad(m: Record<string, unknown> | null): boolean {
  if (!m || !("year" in m)) return true;
  const v = m.year;
  if (v === null || v === undefined) return true;
  if (typeof v === "number" && Number.isFinite(v)) return false;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    return false;
  return true;
}

export async function validateGuidelineChunks(
  supabase: SupabaseClient,
): Promise<GuidelineValidationResult> {
  const rows = await fetchAllRows<GuidelineRow>(
    supabase,
    "guideline_chunks",
    "id, chunk_text, embedding, metadata",
  );

  const shortSamples: string[] = [];
  const longSamples: string[] = [];
  const citeSamples: string[] = [];

  let shortWarn = 0;
  let longWarn = 0;
  let embedErr = 0;
  let univErr = 0;
  let yearErr = 0;
  let citeWarn = 0;

  const idLabel = (r: GuidelineRow) => `id=${r.id}`;

  for (const r of rows) {
    const text = r.chunk_text ?? "";
    const len = [...text].length;

    if (len < 50) {
      shortWarn += 1;
      if (shortSamples.length < 20) shortSamples.push(idLabel(r));
    }
    if (len > 3000) {
      longWarn += 1;
      if (longSamples.length < 20) longSamples.push(idLabel(r));
    }

    if (embeddingMissing(r.embedding)) embedErr += 1;

    const meta = r.metadata;
    const univ = metaString(meta, "univ_name");
    if (univ === null) univErr += 1;

    if (metaYearBad(meta)) yearErr += 1;

    if (
      !meta ||
      !("citation_hint" in meta) ||
      meta.citation_hint === null ||
      meta.citation_hint === undefined ||
      String(meta.citation_hint).trim() === ""
    ) {
      citeWarn += 1;
      if (citeSamples.length < 20) citeSamples.push(idLabel(r));
    }
  }

  const warnCount = shortWarn + longWarn + citeWarn;
  const errorCount = embedErr + univErr + yearErr;

  const lines: string[] = [
    `[PASS] guideline_chunks: ${rows.length}건 검증 완료`,
    `[WARN] chunk_text 50자 미만: ${shortWarn}건 (${formatSampleList(shortSamples)})`,
    `[WARN] chunk_text 3000자 초과: ${longWarn}건 (${formatSampleList(longSamples)})`,
    `[ERROR] embedding 누락: ${embedErr}건`,
    `[ERROR] metadata.univ_name null: ${univErr}건`,
    `[ERROR] metadata.year null 또는 비정상: ${yearErr}건`,
    `[WARN] metadata.citation_hint null 또는 빈 값: ${citeWarn}건 (${formatSampleList(citeSamples)})`,
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
  const result = await validateGuidelineChunks(supabase);
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.errorCount > 0 ? 1 : 0;
}

const isMain = process.argv[1]?.includes("validate_guideline_chunks");

if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
