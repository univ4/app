/**
 * admission_records 정시 컷오프 정확도(이상값) 검증
 *
 * 실행: ./node_modules/.bin/tsx scripts/validate/validate_cutoff_accuracy.ts
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceClient,
  formatSampleList,
} from "./_shared.js";

type JeongsiCutoffRow = {
  univ_name: string;
  dept_name: string;
  cutoff_score: number | null;
  year: number;
  admission_type: string;
};

type ScoringRuleRow = {
  university_name: string;
};

export type CutoffValidationResult = {
  totalRows: number;
  errorCount: number;
  warnCount: number;
  lines: string[];
};

const SAMPLE_LIMIT = 5000;

function toFiniteNumber(v: number | string | null): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function calcStddev(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function validateCutoffAccuracy(
  supabase: SupabaseClient,
): Promise<CutoffValidationResult> {
  const { data, error } = await supabase
    .from("admission_records")
    .select("univ_name, dept_name, cutoff_score, year, admission_type")
    .in("admission_type", ["정시", "학생부교과", "학생부종합", "논술전형"])
    .order("id", { ascending: false })
    .limit(SAMPLE_LIMIT);

  if (error) {
    throw new Error(`admission_records 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as JeongsiCutoffRow[];
  const uniqueUnivs = Array.from(new Set(rows.map((r) => r.univ_name)));

  const { data: ruleRows, error: ruleErr } = await supabase
    .from("university_scoring_rules")
    .select("university_name")
    .eq("admission_year", 2026)
    .in("university_name", uniqueUnivs);

  if (ruleErr) {
    throw new Error(`university_scoring_rules 조회 실패: ${ruleErr.message}`);
  }

  const ruleUnivSet = new Set(
    ((ruleRows ?? []) as ScoringRuleRow[]).map((r) => r.university_name),
  );
  const missingRuleUnivs = uniqueUnivs.filter((u) => !ruleUnivSet.has(u));

  const rangeWarnSamplesJeongsi: string[] = [];
  const rangeWarnSamplesGyogwa: string[] = [];
  const rangeWarnSamplesJonghap: string[] = [];
  const rangeWarnSamplesNonsul: string[] = [];
  const nullWarnSamplesGyogwa: string[] = [];
  const zeroErrorSamples: string[] = [];
  let rangeWarnCountJeongsi = 0;
  let rangeWarnCountGyogwa = 0;
  let rangeWarnCountJonghap = 0;
  let rangeWarnCountNonsul = 0;
  let nullWarnCountGyogwa = 0;
  let zeroErrorCount = 0;

  const groupScores = new Map<string, number[]>();

  for (const row of rows) {
    const cutoff = toFiniteNumber(row.cutoff_score);
    const label = `${row.univ_name}/${row.dept_name}/${cutoff ?? "null"}`;

    if (cutoff === 0) {
      zeroErrorCount += 1;
      if (zeroErrorSamples.length < 30) zeroErrorSamples.push(label);
    }

    if (row.admission_type === "정시") {
      if (cutoff !== null && (cutoff < 300 || cutoff > 900)) {
        rangeWarnCountJeongsi += 1;
        if (rangeWarnSamplesJeongsi.length < 30) {
          rangeWarnSamplesJeongsi.push(label);
        }
      }
    } else if (row.admission_type === "학생부교과") {
      if (cutoff === null) {
        nullWarnCountGyogwa += 1;
        if (nullWarnSamplesGyogwa.length < 30) nullWarnSamplesGyogwa.push(label);
      } else if (cutoff < 0.5 || cutoff > 9.5) {
        rangeWarnCountGyogwa += 1;
        if (rangeWarnSamplesGyogwa.length < 30) {
          rangeWarnSamplesGyogwa.push(label);
        }
      }
    } else if (row.admission_type === "학생부종합") {
      if (cutoff !== null && (cutoff < 0.5 || cutoff > 9.5)) {
        rangeWarnCountJonghap += 1;
        if (rangeWarnSamplesJonghap.length < 30) {
          rangeWarnSamplesJonghap.push(label);
        }
      }
    } else if (row.admission_type === "논술전형") {
      if (cutoff !== null && (cutoff < 300 || cutoff > 900)) {
        rangeWarnCountNonsul += 1;
        if (rangeWarnSamplesNonsul.length < 30) {
          rangeWarnSamplesNonsul.push(label);
        }
      }
    }

    if (row.admission_type === "정시" && cutoff !== null) {
      const groupKey = `${row.univ_name}__${row.year}`;
      const prev = groupScores.get(groupKey) ?? [];
      prev.push(cutoff);
      groupScores.set(groupKey, prev);
    }
  }

  const stdWarnSamples: string[] = [];
  let stdWarnCount = 0;
  for (const [groupKey, scores] of groupScores.entries()) {
    if (scores.length < 2) continue;
    const stddev = calcStddev(scores);
    if (stddev > 100) {
      stdWarnCount += 1;
      if (stdWarnSamples.length < 30) {
        const [univ, year] = groupKey.split("__");
        stdWarnSamples.push(`${univ}/${year}/stddev=${stddev.toFixed(2)}`);
      }
    }
  }

  const rangeWarnCountTotal =
    rangeWarnCountJeongsi +
    rangeWarnCountGyogwa +
    rangeWarnCountJonghap +
    rangeWarnCountNonsul;
  const passCount = rows.length - rangeWarnCountTotal - nullWarnCountGyogwa - zeroErrorCount;
  const warnCount =
    rangeWarnCountTotal +
    nullWarnCountGyogwa +
    stdWarnCount +
    missingRuleUnivs.length;
  const errorCount = zeroErrorCount;

  const lines: string[] = [
    `[PASS] 컷오프 범위 검증: ${Math.max(passCount, 0)}건 정상`,
    `[WARN] 정시 컷오프 범위 이상(<300 or >900): ${rangeWarnCountJeongsi}건 (${formatSampleList(rangeWarnSamplesJeongsi)})`,
    `[WARN] 학생부교과 컷오프 범위 이상(<0.5 or >9.5): ${rangeWarnCountGyogwa}건 (${formatSampleList(rangeWarnSamplesGyogwa)})`,
    `[WARN] 학생부교과 cutoff_score null: ${nullWarnCountGyogwa}건 (${formatSampleList(nullWarnSamplesGyogwa)})`,
    `[WARN] 학생부종합 컷오프 범위 이상(<0.5 or >9.5): ${rangeWarnCountJonghap}건 (${formatSampleList(rangeWarnSamplesJonghap)})`,
    `[WARN] 논술전형 컷오프 범위 이상(<300 or >900): ${rangeWarnCountNonsul}건 (${formatSampleList(rangeWarnSamplesNonsul)})`,
    `[WARN] 대학 내 컷오프 표준편차 이상: ${stdWarnCount}건 (${formatSampleList(stdWarnSamples)})`,
    `[WARN] 대학 규칙 미매핑(university_scoring_rules): ${missingRuleUnivs.length}건 (${formatSampleList(missingRuleUnivs)})`,
    `[ERROR] cutoff_score = 0: ${zeroErrorCount}건 (${formatSampleList(zeroErrorSamples)})`,
    `[SUMMARY] 오류: ${errorCount}건, 경고: ${warnCount}건, 표본: ${rows.length}건`,
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
  const result = await validateCutoffAccuracy(supabase);
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.errorCount > 0 ? 1 : 0;
}

const isMain = process.argv[1]?.includes("validate_cutoff_accuracy");

if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
