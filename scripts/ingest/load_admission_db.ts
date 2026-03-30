/**
 * data-collector GitHub Release → public.admission_records 적재
 *
 * 매뉴얼 §3.2 전체 대학 자동 스캔용 입결 데이터.
 * 스키마: supabase/migrations/20260329000002_admission_records.sql
 *
 * 환경 변수: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 필수(비공개 저장소): GITHUB_TOKEN — api.github.com Bearer + octet-stream 자산 다운로드
 *
 * 실행: ./node_modules/.bin/tsx scripts/ingest/load_admission_db.ts
 */

import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchGithubReleaseAsset } from "./githubReleaseFetch.js";

const DATA_COLLECTOR_REPO = "univ4/data-collector";
const RELEASE_TAG = "v2026.1";
const ADMISSION_JSONL_FILE = "admission_db.jsonl";
const RUN_SUMMARY_FILE = "run_summary.json";

const BATCH_SIZE = 500;
const DEFAULT_SOURCE = "admission_db.jsonl";

const ADMISSION_TYPES = new Set(["학생부교과", "학생부종합", "논술전형", "정시"]);

type AdmissionRecordInsert = {
  univ_name: string;
  dept_name: string;
  admission_type: string;
  year: number;
  cutoff_score: number | null;
  competition_ratio: number | null;
  med_shift_coeff: number | null;
  source: string;
};

function getEnvUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  if (!url.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL 이 필요합니다.",
    );
  }
  return url.trim();
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return key.trim();
}

function getStr(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function getOptionalNumber(
  obj: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length === 0) continue;
      const n = Number(t);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function getRequiredInt(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "number" && Number.isInteger(v)) return v;
    if (typeof v === "number" && Number.isFinite(v))
      return Math.trunc(v);
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length === 0) continue;
      const n = parseInt(t, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/** JSONL 필드 → admission_records 컬럼 (마이그레이션 00002 기준). 우선 동일 스네이크 케이스 키, 보조 별칭. */
function mapJsonlToRow(
  raw: Record<string, unknown>,
): { ok: true; row: AdmissionRecordInsert } | { ok: false; reason: string } {
  const univName = getStr(raw, [
    "univ_name",
    "university_name",
    "university",
    "univ",
    "school_name",
    "대학명",
    "대학",
  ]);
  if (!univName) {
    return { ok: false, reason: "univ_name 계열 필드 없음" };
  }

  let deptName = getStr(raw, [
    "dept_name",
    "department_name",
    "department",
    "major_group",
    "major",
    "모집단위",
    "학과",
  ]);
  if (!deptName) {
    const 전형명 = getStr(raw, ["전형명", "admission_name", "track_name"]);
    const 계열 = getStr(raw, ["계열", "track", "division"]);
    if (전형명 && 계열) deptName = `${전형명}|${계열}`;
    else deptName = 전형명 ?? 계열;
  }
  if (!deptName) {
    return { ok: false, reason: "dept_name 계열 필드 없음" };
  }

  const admissionTypeRaw = getStr(raw, [
    "admission_type",
    "전형유형",
    "admission_track",
  ]);
  if (!admissionTypeRaw) {
    return { ok: false, reason: "admission_type 계열 필드 없음" };
  }
  if (!ADMISSION_TYPES.has(admissionTypeRaw)) {
    return {
      ok: false,
      reason: `admission_type 값 불가: ${JSON.stringify(admissionTypeRaw)} (허용: 학생부교과|학생부종합|논술전형|정시)`,
    };
  }

  const year = getRequiredInt(raw, [
    "year",
    "admission_year",
    "입시연도",
    "모집연도",
  ]);
  if (year === undefined) {
    return { ok: false, reason: "year(admission_year 등) 정수 필드 없음" };
  }

  const source =
    getStr(raw, ["source", "data_source", "출처"]) ?? DEFAULT_SOURCE;

  const row: AdmissionRecordInsert = {
    univ_name: univName,
    dept_name: deptName,
    admission_type: admissionTypeRaw,
    year,
    cutoff_score: getOptionalNumber(raw, [
      "cutoff_score",
      "cut_off_score",
      "cutoff",
      "컷오프",
      "최종컷",
    ]),
    competition_ratio: getOptionalNumber(raw, [
      "competition_ratio",
      "competition_rate",
      "경쟁률",
    ]),
    med_shift_coeff: getOptionalNumber(raw, [
      "med_shift_coeff",
      "med_shift",
      "medical_shift_coeff",
      "discount_factor",
    ]),
    source,
  };

  return { ok: true, row };
}

function admissionDedupeKey(row: AdmissionRecordInsert): string {
  return `${row.univ_name}||${row.dept_name}||${row.admission_type}||${row.year}`;
}

async function* streamJsonlLines(
  open: () => Promise<Response>,
  label: string,
): AsyncGenerator<string> {
  const res = await open();
  const body = res.body;
  if (!body) throw new Error(`${label}: 응답 body 없음`);

  const nodeReadable = Readable.fromWeb(
    body as import("node:stream/web").ReadableStream,
  );
  const rl = createInterface({ input: nodeReadable, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim().length > 0) yield line;
  }
}

function extractRecordCount(summary: unknown): number | null {
  if (!summary || typeof summary !== "object") return null;
  const o = summary as Record<string, unknown>;
  const direct = [
    "record_count",
    "total_records",
    "records",
    "line_count",
    "rows",
  ] as const;
  for (const k of direct) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  }
  const stats = o.stats;
  if (stats && typeof stats === "object") {
    const s = stats as Record<string, unknown>;
    for (const k of direct) {
      const v = s[k];
      if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    }
  }
  return null;
}

async function upsertBatch(
  supabase: SupabaseClient,
  rows: AdmissionRecordInsert[],
): Promise<{ ok: number; fail: number }> {
  const { error } = await supabase.from("admission_records").upsert(rows, {
    onConflict: "univ_name,dept_name,admission_type,year",
  });
  if (!error) return { ok: rows.length, fail: 0 };

  console.error(
    `[ingest] 배치 upsert 실패 (${rows.length}건), 건별 재시도: ${error.message}`,
  );
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const { error: e } = await supabase.from("admission_records").upsert([row], {
      onConflict: "univ_name,dept_name,admission_type,year",
    });
    if (e) {
      fail += 1;
      console.error(
        `[ingest] skip upsert: ${e.message} | row=${JSON.stringify(row)}`,
      );
    } else {
      ok += 1;
    }
  }
  return { ok, fail };
}

async function main(): Promise<void> {
  const supabase = createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `[ingest] GitHub Release 자산(api): ${DATA_COLLECTOR_REPO}@${RELEASE_TAG}/${ADMISSION_JSONL_FILE}`,
  );
  let lineNo = 0;
  let skipCount = 0;
  const dedupeMap = new Map<string, AdmissionRecordInsert>();
  let validParsed = 0;

  for await (const line of streamJsonlLines(
    () =>
      fetchGithubReleaseAsset(
        DATA_COLLECTOR_REPO,
        RELEASE_TAG,
        ADMISSION_JSONL_FILE,
      ),
    ADMISSION_JSONL_FILE,
  )) {
    lineNo += 1;
    let raw: unknown;
    try {
      raw = JSON.parse(line) as unknown;
    } catch (e) {
      skipCount += 1;
      console.error(
        `[ingest] skip JSON 파싱 실패 line=${lineNo}: ${e instanceof Error ? e.message : e}`,
      );
      continue;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      skipCount += 1;
      console.error(
        `[ingest] skip 객체 아님 line=${lineNo}: ${JSON.stringify(raw).slice(0, 200)}`,
      );
      continue;
    }
    const mapped = mapJsonlToRow(raw as Record<string, unknown>);
    if (!mapped.ok) {
      skipCount += 1;
      console.error(
        `[ingest] skip 매핑 line=${lineNo}: ${mapped.reason} | raw=${line.slice(0, 300)}`,
      );
      continue;
    }
    validParsed += 1;
    dedupeMap.set(admissionDedupeKey(mapped.row), mapped.row);
  }

  console.log(
    `[ingest] 중복 제거: ${validParsed} → ${dedupeMap.size}건`,
  );

  const uniqueRows = Array.from(dedupeMap.values());
  let loadedCount = 0;
  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const chunk = uniqueRows.slice(i, i + BATCH_SIZE);
    const { ok, fail } = await upsertBatch(supabase, chunk);
    loadedCount += ok;
    skipCount += fail;
  }

  console.log("");
  console.log(`적재 건수: ${loadedCount}`);
  console.log(`skip된 레코드 수: ${skipCount}`);

  let summaryNote = "";
  try {
    const sumRes = await fetchGithubReleaseAsset(
      DATA_COLLECTOR_REPO,
      RELEASE_TAG,
      RUN_SUMMARY_FILE,
    );
    const summaryJson: unknown = await sumRes.json();
    const expected = extractRecordCount(summaryJson);
    if (expected === null) {
      summaryNote = `run_summary 검증: 스킵 (record_count 필드를 찾지 못함)`;
    } else {
      const match = loadedCount === expected;
      summaryNote = `run_summary.record_count: ${expected}\nrun_summary 검증: ${match ? "일치" : "불일치"} (적재 ${loadedCount} vs 기대 ${expected})`;
    }
  } catch (e) {
    summaryNote = `run_summary 검증: 스킵 (${e instanceof Error ? e.message : e})`;
  }
  console.log(summaryNote);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
