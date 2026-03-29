/**
 * record/student_record.json → 생활기록부 7테이블 upsert/insert
 *
 * 입력 JSON 최상위 키 (배열, 없으면 빈 배열 처리):
 *   attendance, awards, activities, volunteer, subject_notes, reading, behavior
 * 각 객체는 DB 컬럼명 snake_case 권장. 별칭 허용:
 *   awards: name→award_name, date→award_date
 *   activities: type→activity_type
 *   subject_notes: subject→subject_name
 *
 * 환경: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 선택: NEIS_STUDENT_ID (없으면 auth.users 첫 페이지 첫 사용자 id)
 *
 * 실행: set -a; source .env.local; set +a
 *       ./node_modules/.bin/tsx scripts/ingest/load_student_record.ts
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const INPUT_PATH = path.join(process.cwd(), "record", "student_record.json");

const BATCH_SIZE = 50;

const ACTIVITY_TYPES = new Set(["자율활동", "동아리활동", "진로활동"]);
type ActivityType = "자율활동" | "동아리활동" | "진로활동";

type StudentRecordFile = {
  attendance?: unknown;
  awards?: unknown;
  activities?: unknown;
  volunteer?: unknown;
  subject_notes?: unknown;
  reading?: unknown;
  behavior?: unknown;
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

function nullableInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length === 0) return null;
    const n = Number(t);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function nonNegIntOrZero(v: unknown): number {
  const n = nullableInt(v);
  if (n === null || n < 0) return 0;
  return n;
}

function requireGrade(v: unknown): 1 | 2 | 3 | null {
  const n = nullableInt(v);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

function requireSemester(v: unknown): 1 | 2 | null {
  const n = nullableInt(v);
  if (n === 1 || n === 2) return n;
  return null;
}

function parseAwardDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    console.warn(
      `[load_student_record] award_date 형식 권장 YYYY-MM-DD, 받음: ${t}`,
    );
    return t;
  }
  return null;
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
    `[load_student_record] NEIS_STUDENT_ID 미설정 → auth.users 첫 사용자 사용: ${first.id}`,
  );
  return first.id;
}

function awardDupKey(
  grade: number,
  awardName: string,
  awardDate: string | null,
): string {
  return `${grade}\u0001${awardName}\u0001${awardDate ?? ""}`;
}

function volunteerDupKey(
  grade: number,
  period: string,
  activity: string,
): string {
  return `${grade}\u0001${period}\u0001${activity}`;
}

async function loadExistingAwardKeys(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("student_awards")
    .select("grade,award_name,award_date")
    .eq("student_id", studentId);
  if (error) {
    throw new Error(`student_awards 기존 행 조회 실패: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const g = row.grade as number;
    const name = row.award_name as string;
    const d = row.award_date as string | null;
    set.add(awardDupKey(g, name, d));
  }
  return set;
}

async function loadExistingVolunteerKeys(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("student_volunteer")
    .select("grade,period,activity")
    .eq("student_id", studentId);
  if (error) {
    throw new Error(`student_volunteer 기존 행 조회 실패: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    set.add(
      volunteerDupKey(
        row.grade as number,
        row.period as string,
        row.activity as string,
      ),
    );
  }
  return set;
}

async function ingestAttendance(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
): Promise<{ upserted: number; skipped: number }> {
  let skipped = 0;
  type Row = {
    student_id: string;
    grade: number;
    school_days: number | null;
    absence_illness: number;
    absence_unauthorized: number;
    absence_other: number;
    late_illness: number;
    late_unauthorized: number;
    late_other: number;
    early_leave_illness: number;
    early_leave_unauthorized: number;
    early_leave_other: number;
    result_illness: number;
    result_unauthorized: number;
    result_other: number;
    note: string | null;
  };
  const out: Row[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] attendance[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    if (grade === null) {
      skipped += 1;
      console.warn(`[load_student_record] attendance[${i}] grade 유효하지 않음`);
      continue;
    }
    out.push({
      student_id: studentId,
      grade,
      school_days: nullableInt(o.school_days),
      absence_illness: nonNegIntOrZero(o.absence_illness),
      absence_unauthorized: nonNegIntOrZero(o.absence_unauthorized),
      absence_other: nonNegIntOrZero(o.absence_other),
      late_illness: nonNegIntOrZero(o.late_illness),
      late_unauthorized: nonNegIntOrZero(o.late_unauthorized),
      late_other: nonNegIntOrZero(o.late_other),
      early_leave_illness: nonNegIntOrZero(o.early_leave_illness),
      early_leave_unauthorized: nonNegIntOrZero(o.early_leave_unauthorized),
      early_leave_other: nonNegIntOrZero(o.early_leave_other),
      result_illness: nonNegIntOrZero(o.result_illness),
      result_unauthorized: nonNegIntOrZero(o.result_unauthorized),
      result_other: nonNegIntOrZero(o.result_other),
      note:
        typeof o.note === "string"
          ? o.note
          : o.note === null || o.note === undefined
            ? null
            : String(o.note),
    });
  }

  let upserted = 0;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("student_attendance").upsert(batch, {
      onConflict: "student_id,grade",
    });
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("student_attendance")
          .upsert(row, { onConflict: "student_id,grade" });
        if (oneErr) {
          skipped += 1;
          console.warn(
            `[load_student_record] student_attendance grade=${row.grade}: ${oneErr.message}`,
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

async function ingestAwards(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
  existing: Set<string>,
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] awards[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    const semester = requireSemester(o.semester);
    const nameRaw = o.award_name ?? o.name;
    const awardName =
      typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (grade === null || semester === null || !awardName) {
      skipped += 1;
      console.warn(
        `[load_student_record] awards[${i}] grade/semester/award_name(name) 불충분, skip`,
      );
      continue;
    }
    const awardDate = parseAwardDate(o.award_date ?? o.date);
    const key = awardDupKey(grade, awardName, awardDate);
    if (existing.has(key)) {
      skipped += 1;
      console.warn(
        `[load_student_record] awards[${i}] 중복(student_id+grade+award_name+award_date), skip`,
      );
      continue;
    }

    const row = {
      student_id: studentId,
      grade,
      semester,
      award_name: awardName,
      rank: typeof o.rank === "string" ? o.rank : o.rank != null ? String(o.rank) : null,
      award_date: awardDate,
      organization:
        typeof o.organization === "string"
          ? o.organization
          : o.organization != null
            ? String(o.organization)
            : null,
      participants:
        typeof o.participants === "string"
          ? o.participants
          : o.participants != null
            ? String(o.participants)
            : null,
    };

    const { error } = await supabase.from("student_awards").insert(row);
    if (error) {
      skipped += 1;
      console.warn(
        `[load_student_record] student_awards insert 실패 awards[${i}]: ${error.message}`,
      );
      continue;
    }
    existing.add(key);
    inserted += 1;
  }
  return { inserted, skipped };
}

async function ingestActivities(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
): Promise<{ upserted: number; skipped: number }> {
  let skipped = 0;
  type Row = {
    student_id: string;
    grade: number;
    activity_type: ActivityType;
    hours: number | null;
    hope_field: string | null;
    content: string;
  };
  const out: Row[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] activities[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    const typeRaw = o.activity_type ?? o.type;
    const activityType =
      typeof typeRaw === "string" ? typeRaw.trim() : "";
    if (grade === null || !ACTIVITY_TYPES.has(activityType as ActivityType)) {
      skipped += 1;
      console.warn(
        `[load_student_record] activities[${i}] grade 또는 activity_type/type(자율활동|동아리활동|진로활동) 불가, skip`,
      );
      continue;
    }
    const content =
      typeof o.content === "string"
        ? o.content
        : o.content != null
          ? String(o.content)
          : "";
    if (!content.trim()) {
      skipped += 1;
      console.warn(
        `[load_student_record] activities[${i}] content 필수, skip`,
      );
      continue;
    }
    out.push({
      student_id: studentId,
      grade,
      activity_type: activityType as ActivityType,
      hours: nullableInt(o.hours),
      hope_field:
        typeof o.hope_field === "string"
          ? o.hope_field
          : o.hope_field != null
            ? String(o.hope_field)
            : null,
      content,
    });
  }

  let upserted = 0;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("student_activities").upsert(batch, {
      onConflict: "student_id,grade,activity_type",
    });
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("student_activities")
          .upsert(row, {
            onConflict: "student_id,grade,activity_type",
          });
        if (oneErr) {
          skipped += 1;
          console.warn(
            `[load_student_record] student_activities ${row.grade} ${row.activity_type}: ${oneErr.message}`,
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

async function ingestVolunteer(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
  existing: Set<string>,
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] volunteer[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    const period =
      typeof o.period === "string" ? o.period.trim() : "";
    const organization =
      typeof o.organization === "string" ? o.organization.trim() : "";
    const activity =
      typeof o.activity === "string" ? o.activity.trim() : "";
    const hours = nullableInt(o.hours);

    if (
      grade === null ||
      !period ||
      !organization ||
      !activity ||
      hours === null
    ) {
      skipped += 1;
      console.warn(
        `[load_student_record] volunteer[${i}] grade/period/organization/activity/hours 불충분, skip`,
      );
      continue;
    }

    const key = volunteerDupKey(grade, period, activity);
    if (existing.has(key)) {
      skipped += 1;
      console.warn(
        `[load_student_record] volunteer[${i}] 중복(student_id+grade+period+activity), skip`,
      );
      continue;
    }

    const row = {
      student_id: studentId,
      grade,
      period,
      organization,
      activity,
      hours,
      cumulative_hours: nullableInt(o.cumulative_hours),
    };

    const { error } = await supabase.from("student_volunteer").insert(row);
    if (error) {
      skipped += 1;
      console.warn(
        `[load_student_record] student_volunteer insert 실패 volunteer[${i}]: ${error.message}`,
      );
      continue;
    }
    existing.add(key);
    inserted += 1;
  }
  return { inserted, skipped };
}

async function ingestSubjectNotes(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
): Promise<{ upserted: number; skipped: number }> {
  let skipped = 0;
  type Row = {
    student_id: string;
    grade: number;
    semester: number;
    subject_name: string;
    note: string;
  };
  const out: Row[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] subject_notes[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    const semester = requireSemester(o.semester);
    const subjectRaw = o.subject_name ?? o.subject;
    const subjectName =
      typeof subjectRaw === "string" ? subjectRaw.trim() : "";
    const note =
      typeof o.note === "string"
        ? o.note
        : o.note != null
          ? String(o.note)
          : "";
    if (grade === null || semester === null || !subjectName || !note.trim()) {
      skipped += 1;
      console.warn(
        `[load_student_record] subject_notes[${i}] grade/semester/subject_name(subject)/note 불충분, skip`,
      );
      continue;
    }
    out.push({
      student_id: studentId,
      grade,
      semester,
      subject_name: subjectName,
      note,
    });
  }

  let upserted = 0;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("student_subject_notes").upsert(
      batch,
      { onConflict: "student_id,grade,semester,subject_name" },
    );
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("student_subject_notes")
          .upsert(row, {
            onConflict: "student_id,grade,semester,subject_name",
          });
        if (oneErr) {
          skipped += 1;
          console.warn(
            `[load_student_record] student_subject_notes ${row.subject_name}: ${oneErr.message}`,
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

async function ingestReading(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  type Row = {
    student_id: string;
    grade: number;
    subject_area: string | null;
    content: string;
  };
  const out: Row[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] reading[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    if (grade === null) {
      skipped += 1;
      console.warn(`[load_student_record] reading[${i}] grade 유효하지 않음`);
      continue;
    }
    if (o.content === null || o.content === undefined) {
      skipped += 1;
      console.warn(`[load_student_record] reading[${i}] content null, skip`);
      continue;
    }
    const content =
      typeof o.content === "string"
        ? o.content
        : String(o.content);
    if (!content.trim()) {
      skipped += 1;
      console.warn(`[load_student_record] reading[${i}] content 빈값, skip`);
      continue;
    }
    out.push({
      student_id: studentId,
      grade,
      subject_area:
        typeof o.subject_area === "string"
          ? o.subject_area
          : o.subject_area != null
            ? String(o.subject_area)
            : null,
      content,
    });
  }

  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("student_reading").insert(batch);
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("student_reading")
          .insert(row);
        if (oneErr) {
          skipped += 1;
          console.warn(
            `[load_student_record] student_reading insert 실패: ${oneErr.message}`,
          );
        } else {
          inserted += 1;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return { inserted, skipped };
}

async function ingestBehavior(
  supabase: SupabaseClient,
  studentId: string,
  rows: unknown[],
): Promise<{ upserted: number; skipped: number }> {
  let skipped = 0;
  type Row = {
    student_id: string;
    grade: number;
    content: string;
  };
  const out: Row[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") {
      skipped += 1;
      console.warn(`[load_student_record] behavior[${i}] 객체 아님, skip`);
      continue;
    }
    const o = raw as Record<string, unknown>;
    const grade = requireGrade(o.grade);
    const content =
      typeof o.content === "string"
        ? o.content
        : o.content != null
          ? String(o.content)
          : "";
    if (grade === null || !content.trim()) {
      skipped += 1;
      console.warn(
        `[load_student_record] behavior[${i}] grade 또는 content 불충분, skip`,
      );
      continue;
    }
    out.push({ student_id: studentId, grade, content });
  }

  let upserted = 0;
  for (let i = 0; i < out.length; i += BATCH_SIZE) {
    const batch = out.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("student_behavior").upsert(batch, {
      onConflict: "student_id,grade",
    });
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase
          .from("student_behavior")
          .upsert(row, { onConflict: "student_id,grade" });
        if (oneErr) {
          skipped += 1;
          console.warn(
            `[load_student_record] student_behavior grade=${row.grade}: ${oneErr.message}`,
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

function asArray(v: unknown): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return [];
  return v;
}

async function main(): Promise<void> {
  const supabase = createClient(getEnvUrl(), getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let text: string;
  try {
    text = await readFile(INPUT_PATH, "utf8");
  } catch (e) {
    throw new Error(
      `파일을 읽을 수 없습니다: ${INPUT_PATH} (${e instanceof Error ? e.message : String(e)})`,
    );
  }

  let payload: StudentRecordFile;
  try {
    payload = JSON.parse(text) as StudentRecordFile;
  } catch (e) {
    throw new Error(
      `JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const studentId = await resolveStudentId(supabase);
  console.log(`[load_student_record] student_id=${studentId}`);
  console.log(`[load_student_record] 입력: ${INPUT_PATH}`);

  const attendance = asArray(payload.attendance);
  const awards = asArray(payload.awards);
  const activities = asArray(payload.activities);
  const volunteer = asArray(payload.volunteer);
  const subjectNotes = asArray(payload.subject_notes);
  const reading = asArray(payload.reading);
  const behavior = asArray(payload.behavior);

  const awardKeys = await loadExistingAwardKeys(supabase, studentId);
  const volunteerKeys = await loadExistingVolunteerKeys(supabase, studentId);

  const att = await ingestAttendance(supabase, studentId, attendance);
  const aw = await ingestAwards(supabase, studentId, awards, awardKeys);
  const act = await ingestActivities(supabase, studentId, activities);
  const vol = await ingestVolunteer(
    supabase,
    studentId,
    volunteer,
    volunteerKeys,
  );
  const sub = await ingestSubjectNotes(supabase, studentId, subjectNotes);
  const read = await ingestReading(supabase, studentId, reading);
  const beh = await ingestBehavior(supabase, studentId, behavior);

  console.log("[load_student_record] 테이블별 적재 건수 (성공 / 스킵·실패):");
  console.log(
    `  student_attendance: ${att.upserted}건 적재, skip·실패 ${att.skipped}건`,
  );
  console.log(
    `  student_awards: ${aw.inserted}건 삽입, skip·실패 ${aw.skipped}건`,
  );
  console.log(
    `  student_activities: ${act.upserted}건 적재, skip·실패 ${act.skipped}건`,
  );
  console.log(
    `  student_volunteer: ${vol.inserted}건 삽입, skip·실패 ${vol.skipped}건`,
  );
  console.log(
    `  student_subject_notes: ${sub.upserted}건 적재, skip·실패 ${sub.skipped}건`,
  );
  console.log(
    `  student_reading: ${read.inserted}건 삽입, skip·실패 ${read.skipped}건`,
  );
  console.log(
    `  student_behavior: ${beh.upserted}건 적재, skip·실패 ${beh.skipped}건`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
