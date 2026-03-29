/**
 * record/parsed/{학기}.json → public.academic_records upsert (NEIS 내신)
 *
 * 입력: record/parsed/1-1.json, 1-2.json, 2-1.json (없으면 해당 학기 skip)
 *
 * 환경: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 선택: NEIS_STUDENT_ID (없으면 auth.users 첫 페이지 첫 사용자 id)
 *
 * 실행: set -a; source .env.local; set +a
 *       ./node_modules/.bin/tsx scripts/ingest/load_neis_grades.ts
 *
 * upsert 전 DB에 `20260329170000_academic_records_fix_unique.sql`(및 선행 마이그레이션) 적용 필요.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  NEIS_SEMESTER_TO_EXAM_DATE,
  type NeisSemester,
} from "../../src/lib/validation/schoolGpaScore";

const PARSED_DIR = path.join(process.cwd(), "record", "parsed");
const SEMESTER_FILES = ["1-1", "1-2", "2-1"] as const satisfies readonly NeisSemester[];

const BATCH_SIZE = 80;

const VALID_ACHIEVEMENT = new Set(["A", "B", "C", "D", "E"]);

type NeisSubjectJson = {
  subject_name?: unknown;
  unit?: unknown;
  total_score?: unknown;
  raw_score?: unknown;
  class_avg?: unknown;
  std_dev?: unknown;
  student_count?: unknown;
  rank?: unknown;
  rank_total?: unknown;
  grade?: unknown;
  achievement?: unknown;
};

type ParsedFile = {
  semester?: unknown;
  subjects?: unknown;
};

type AcademicNeisRow = {
  student_id: string;
  record_type: "SCHOOL_GPA";
  exam_date: string;
  semester: NeisSemester;
  subject_category: "general" | "career_choice" | "pe_art";
  subject_name: string;
  credit_unit: number;
  total_score: number | null;
  raw_score: number | null;
  avg_score: number | null;
  stddev_score: number | null;
  student_count: number | null;
  class_rank: number | null;
  rank_total: number | null;
  school_grade: number | null;
  achievement_level: "A" | "B" | "C" | "D" | "E" | null;
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

function nullableFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length === 0) return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function nullablePositiveInt(v: unknown): number | null {
  const n = nullableFiniteNumber(v);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function normalizeAchievement(v: unknown): "A" | "B" | "C" | "D" | "E" | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  if (!VALID_ACHIEVEMENT.has(u)) return null;
  return u as "A" | "B" | "C" | "D" | "E";
}

function subjectCategory(
  grade: number | null,
  achievementNorm: "A" | "B" | "C" | "D" | "E" | null,
): "general" | "career_choice" | "pe_art" {
  if (grade !== null) return "general";
  if (achievementNorm !== null) return "career_choice";
  return "pe_art";
}

function rankPairValid(
  classRank: number | null,
  rankTotal: number | null,
): boolean {
  if (classRank === null && rankTotal === null) return true;
  if (classRank === null || rankTotal === null) return false;
  return classRank >= 1 && classRank <= rankTotal;
}

function mapJsonToRow(
  studentId: string,
  semester: NeisSemester,
  raw: NeisSubjectJson,
): { ok: true; row: AcademicNeisRow } | { ok: false; reason: string } {
  if (typeof raw.subject_name !== "string" || !raw.subject_name.trim()) {
    return { ok: false, reason: "subject_name 없음" };
  }

  const credit_unit = nullablePositiveInt(raw.unit);
  if (credit_unit === null) {
    return { ok: false, reason: "unit 없음 또는 1 미만" };
  }

  const grade = nullableFiniteNumber(raw.grade);
  const achievementNorm = normalizeAchievement(raw.achievement);
  const category = subjectCategory(grade, achievementNorm);

  const cr = nullablePositiveInt(raw.rank);
  const rt = nullablePositiveInt(raw.rank_total);

  if (category === "general") {
    if (!rankPairValid(cr, rt)) {
      return {
        ok: false,
        reason: "보통교과 석차/전체인원 쌍 불일치(class_rank·rank_total)",
      };
    }
  }

  const exam_date = NEIS_SEMESTER_TO_EXAM_DATE[semester];
  const subject_name = raw.subject_name.trim();
  const total_score = nullableFiniteNumber(raw.total_score);
  const raw_score = nullableFiniteNumber(raw.raw_score);
  const avg_score = nullableFiniteNumber(raw.class_avg);
  const stddev_score = nullableFiniteNumber(raw.std_dev);
  const student_count = nullablePositiveInt(raw.student_count);

  const school_grade =
    category === "general" && grade !== null ? grade : null;

  const achievement_level = achievementNorm;

  let class_rank_out: number | null = null;
  let rank_total_out: number | null = null;
  let avg_out: number | null = avg_score;
  let std_out: number | null = stddev_score;
  let student_count_out: number | null = student_count;
  let total_out: number | null = total_score;

  if (category === "general") {
    class_rank_out = cr;
    rank_total_out = rt;
  } else if (category === "career_choice") {
    class_rank_out = null;
    rank_total_out = null;
  } else {
    class_rank_out = null;
    rank_total_out = null;
    avg_out = null;
    std_out = null;
    student_count_out = null;
    total_out = null;
  }

  return {
    ok: true,
    row: {
      student_id: studentId,
      record_type: "SCHOOL_GPA",
      exam_date,
      semester,
      subject_category: category,
      subject_name,
      credit_unit,
      total_score: total_out,
      raw_score,
      avg_score: avg_out,
      stddev_score: std_out,
      student_count: student_count_out,
      class_rank: class_rank_out,
      rank_total: rank_total_out,
      school_grade,
      achievement_level,
    },
  };
}

async function resolveStudentId(supabase: SupabaseClient): Promise<string> {
  const fromEnv = process.env.NEIS_STUDENT_ID?.trim();
  if (fromEnv) return fromEnv;

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error) {
    throw new Error(`auth.users 조회 실패: ${error.message}`);
  }
  const first = data.users[0];
  if (!first?.id) {
    throw new Error(
      "NEIS_STUDENT_ID 없고 auth.users에 사용자가 없습니다.",
    );
  }
  console.warn(
    `[load_neis_grades] NEIS_STUDENT_ID 미설정 → auth.users 첫 사용자 사용: ${first.id}`,
  );
  return first.id;
}

async function loadSemesterFile(
  supabase: SupabaseClient,
  studentId: string,
  semester: NeisSemester,
): Promise<{ upserted: number; skipped: number }> {
  const filePath = path.join(PARSED_DIR, `${semester}.json`);
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    console.warn(`[load_neis_grades] 파일 없음, skip: ${filePath}`);
    return { upserted: 0, skipped: 0 };
  }

  let payload: ParsedFile;
  try {
    payload = JSON.parse(text) as ParsedFile;
  } catch (e) {
    console.error(`[load_neis_grades] JSON 파싱 실패 ${filePath}:`, e);
    return { upserted: 0, skipped: 0 };
  }

  const fileSemester = payload.semester;
  if (typeof fileSemester === "string" && fileSemester !== semester) {
    console.warn(
      `[load_neis_grades] 파일 내 semester("${fileSemester}") ≠ 파일명("${semester}") — 파일명 기준으로 적재합니다.`,
    );
  }

  if (!Array.isArray(payload.subjects)) {
    console.error(`[load_neis_grades] subjects 배열 없음: ${filePath}`);
    return { upserted: 0, skipped: 0 };
  }

  const rows: AcademicNeisRow[] = [];
  let skipped = 0;

  for (let i = 0; i < payload.subjects.length; i++) {
    const item = payload.subjects[i] as NeisSubjectJson;
    const mapped = mapJsonToRow(studentId, semester, item);
    if (!mapped.ok) {
      skipped += 1;
      console.warn(
        `[load_neis_grades] skip [${semester}] #${i + 1} ${item.subject_name ?? "?"}: ${mapped.reason}`,
      );
      continue;
    }
    rows.push(mapped.row);
  }

  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("academic_records").upsert(batch, {
      onConflict: "student_id,semester,subject_name,credit_unit",
    });
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("academic_records")
          .upsert(row, {
            onConflict: "student_id,semester,subject_name,credit_unit",
          });
        if (oneErr) {
          skipped += 1;
          const hint =
            oneErr.message.includes("unique or exclusion constraint")
              ? " (Supabase에 supabase/migrations/20260329170000_academic_records_fix_unique.sql 적용 여부 확인)"
              : "";
          console.warn(
            `[load_neis_grades] skip upsert ${row.semester} ${row.subject_name}: ${oneErr.message}${hint}`,
          );
        } else {
          upserted += 1;
        }
      }
    } else {
      upserted += batch.length;
    }
  }

  return { upserted, skipped };
}

async function main(): Promise<void> {
  const supabase = createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const studentId = await resolveStudentId(supabase);
  console.log(`[load_neis_grades] student_id=${studentId}`);

  const counts: Record<string, { upserted: number; skipped: number }> = {};

  for (const semester of SEMESTER_FILES) {
    counts[semester] = await loadSemesterFile(supabase, studentId, semester);
  }

  console.log("[load_neis_grades] 학기별 적재 건수 (upsert 성공 / 스킵·실패):");
  for (const semester of SEMESTER_FILES) {
    const c = counts[semester];
    console.log(`  ${semester}: ${c.upserted}건 적재, skip·실패 ${c.skipped}건`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
