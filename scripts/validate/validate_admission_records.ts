/**
 * admission_records 데이터 품질 검증
 *
 * 실행: ./node_modules/.bin/tsx scripts/validate/validate_admission_records.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceClient,
  fetchAllRows,
  formatSampleList,
} from "./_shared.js";

export const ALLOWED_ADMISSION_TYPES = new Set([
  "학생부교과",
  "학생부종합",
  "논술전형",
  "정시",
  "실기",
  "특기자",
]);

type AdmissionRow = {
  id: number;
  univ_name: string | null;
  dept_name: string | null;
  admission_type: string;
  year: number;
  cutoff_score: number | null;
  competition_ratio: number | null;
  med_shift_coeff: number | null;
};

export type AdmissionValidationResult = {
  totalRows: number;
  errorCount: number;
  warnCount: number;
  lines: string[];
};

function numLeqZero(v: number | null): boolean {
  if (v === null) return true;
  return typeof v === "number" && Number.isFinite(v) && v <= 0;
}

function medShiftOutOfRange(v: number | null): boolean {
  if (v === null) return false;
  if (typeof v !== "number" || !Number.isFinite(v)) return true;
  return v < 0 || v > 5;
}

function univInvalid(u: string | null): boolean {
  return u === null || String(u).trim() === "";
}

export async function validateAdmissionRecords(
  supabase: SupabaseClient,
): Promise<AdmissionValidationResult> {
  const rows = await fetchAllRows<AdmissionRow>(
    supabase,
    "admission_records",
    "id, univ_name, dept_name, admission_type, year, cutoff_score, competition_ratio, med_shift_coeff",
  );

  const cutoffWarnSamples: string[] = [];
  const ratioWarnSamples: string[] = [];
  const deptWarnSamples: string[] = [];
  const medShiftWarnSamples: string[] = [];

  let cutoffBad = 0;
  let ratioBad = 0;
  let deptBad = 0;
  let medShiftBad = 0;

  for (const r of rows) {
    const label = `${r.univ_name ?? "(null)"} / ${r.dept_name ?? "(null)"}`;

    if (numLeqZero(r.cutoff_score)) {
      cutoffBad += 1;
      if (cutoffWarnSamples.length < 30) cutoffWarnSamples.push(label);
    }

    if (numLeqZero(r.competition_ratio)) {
      ratioBad += 1;
      if (ratioWarnSamples.length < 30) ratioWarnSamples.push(label);
    }

    if (r.dept_name === null || String(r.dept_name).trim() === "") {
      deptBad += 1;
      if (deptWarnSamples.length < 30) deptWarnSamples.push(label);
    }

    if (medShiftOutOfRange(r.med_shift_coeff)) {
      medShiftBad += 1;
      if (medShiftWarnSamples.length < 30) medShiftWarnSamples.push(label);
    }
  }

  const typeMismatch = rows.filter(
    (r) => !ALLOWED_ADMISSION_TYPES.has(r.admission_type),
  ).length;
  const univNull = rows.filter((r) => univInvalid(r.univ_name)).length;
  const yearBad = rows.filter((r) => r.year < 2020 || r.year > 2030).length;

  const errorCount = typeMismatch + univNull + yearBad;
  const warnCount = cutoffBad + ratioBad + deptBad + medShiftBad;

  const lines: string[] = [
    `[PASS] admission_records: ${rows.length}건 검증 완료`,
    `[WARN] cutoff_score null 또는 0 이하: ${cutoffBad}건 (${formatSampleList(cutoffWarnSamples)})`,
    `[WARN] competition_ratio null 또는 0 이하: ${ratioBad}건 (${formatSampleList(ratioWarnSamples)})`,
    `[ERROR] admission_type 불일치: ${typeMismatch}건`,
    `[WARN] dept_name null 또는 빈 문자열: ${deptBad}건 (${formatSampleList(deptWarnSamples)})`,
    `[ERROR] univ_name null 또는 빈 문자열: ${univNull}건`,
    `[ERROR] year 범위(2020~2030) 밖: ${yearBad}건`,
    `[WARN] med_shift_coeff 0 미만 또는 5 초과: ${medShiftBad}건 (${formatSampleList(medShiftWarnSamples)})`,
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
  const result = await validateAdmissionRecords(supabase);
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.errorCount > 0 ? 1 : 0;
}

const isMain = process.argv[1]?.includes("validate_admission_records");

if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
