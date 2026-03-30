/**
 * 생활기록부 구조화 테이블 → OpenAI 임베딩 → student_record_chunks (pgvector)
 *
 * @see scripts/ingest/embed_and_store.ts (임베딩·배치 패턴)
 * @see docs/08_STUDENT_RECORD_SPEC.md (RAG 적재 대상)
 *
 * 실행:
 *   set -a; source .env.local; set +a &&
 *   ./node_modules/.bin/tsx scripts/ingest/embed_student_record.ts
 */

import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const EMBED_BATCH_SIZE = 50;

type SectionKo = "세특" | "창체" | "행동특성";

type ChunkMetadata = {
  section: SectionKo;
  grade: number;
  subject_name?: string;
  activity_type?: string;
  content_sha256: string;
};

type PreparedRow = {
  student_id: string;
  chunk_text: string;
  content_sha256: string;
  metadata: ChunkMetadata;
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

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key.trim()) throw new Error("OPENAI_API_KEY 가 필요합니다.");
  return key.trim();
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
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
    `[embed_student_record] NEIS_STUDENT_ID 미설정 → auth.users 첫 사용자 사용: ${first.id}`,
  );
  return first.id;
}

async function loadExistingContentHashes(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_record_chunks")
      .select("content_sha256")
      .eq("student_id", studentId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      const h = row.content_sha256;
      if (typeof h === "string" && h.length > 0) set.add(h);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const key = getOpenAIKey();
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      "error" in json &&
      (json as { error?: { message?: string } }).error?.message;
    throw new Error(
      `OpenAI embeddings ${res.status}: ${msg || JSON.stringify(json).slice(0, 400)}`,
    );
  }
  if (
    !json ||
    typeof json !== "object" ||
    !("data" in json) ||
    !Array.isArray((json as { data: unknown }).data)
  ) {
    throw new Error("OpenAI embeddings 응답 형식 오류");
  }
  const arr = (json as { data: { embedding: number[]; index: number }[] })
    .data;
  arr.sort((a, b) => a.index - b.index);
  return arr.map((d) => d.embedding);
}

function buildChunksFromNotes(
  studentId: string,
  rows: {
    grade: number;
    semester: number;
    subject_name: string;
    note: string;
  }[],
): PreparedRow[] {
  const out: PreparedRow[] = [];
  for (const r of rows) {
    const body = r.note.trim();
    if (!body) continue;
    const chunkText =
      `[세특] ${r.grade}학년 ${r.semester}학기 · ${r.subject_name}\n\n${body}`;
    const hash = sha256Hex(chunkText);
    out.push({
      student_id: studentId,
      chunk_text: chunkText,
      content_sha256: hash,
      metadata: {
        section: "세특",
        grade: r.grade,
        subject_name: r.subject_name,
        content_sha256: hash,
      },
    });
  }
  return out;
}

function buildChunksFromActivities(
  studentId: string,
  rows: {
    grade: number;
    activity_type: string;
    hours: number | null;
    hope_field: string | null;
    content: string;
  }[],
): PreparedRow[] {
  const out: PreparedRow[] = [];
  for (const r of rows) {
    const body = r.content.trim();
    if (!body) continue;
    const parts = [
      `[창체] ${r.grade}학년 · ${r.activity_type}`,
      r.hours != null ? `시간: ${r.hours}` : null,
      r.activity_type === "진로활동" && r.hope_field?.trim()
        ? `희망분야: ${r.hope_field.trim()}`
        : null,
      "",
      body,
    ].filter((p) => p !== null);
    const chunkText = parts.join("\n");
    const hash = sha256Hex(chunkText);
    out.push({
      student_id: studentId,
      chunk_text: chunkText,
      content_sha256: hash,
      metadata: {
        section: "창체",
        grade: r.grade,
        activity_type: r.activity_type,
        content_sha256: hash,
      },
    });
  }
  return out;
}

function buildChunksFromBehavior(
  studentId: string,
  rows: { grade: number; content: string }[],
): PreparedRow[] {
  const out: PreparedRow[] = [];
  for (const r of rows) {
    const body = r.content.trim();
    if (!body) continue;
    const chunkText = `[행동특성] ${r.grade}학년\n\n${body}`;
    const hash = sha256Hex(chunkText);
    out.push({
      student_id: studentId,
      chunk_text: chunkText,
      content_sha256: hash,
      metadata: {
        section: "행동특성",
        grade: r.grade,
        content_sha256: hash,
      },
    });
  }
  return out;
}

async function upsertChunkRows(
  supabase: SupabaseClient,
  rows: {
    student_id: string;
    chunk_text: string;
    embedding: number[];
    metadata: ChunkMetadata;
    content_sha256: string;
  }[],
): Promise<{ ok: number; fail: number }> {
  if (rows.length === 0) return { ok: 0, fail: 0 };
  const { error } = await supabase.from("student_record_chunks").upsert(rows, {
    onConflict: "student_id,content_sha256",
  });
  if (!error) return { ok: rows.length, fail: 0 };

  console.error(
    `[embed_student_record] 배치 upsert 실패 (${rows.length}건), 건별 재시도: ${error.message}`,
  );
  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const { error: e } = await supabase
      .from("student_record_chunks")
      .upsert([row], { onConflict: "student_id,content_sha256" });
    if (e) {
      fail += 1;
      console.error(`[embed_student_record] skip upsert: ${e.message}`);
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

  const studentId = await resolveStudentId(supabase);
  console.log(`[embed_student_record] student_id=${studentId}`);
  console.log(
    `[embed_student_record] 임베딩 모델: ${EMBEDDING_MODEL}, 배치: ${EMBED_BATCH_SIZE}`,
  );

  const [notesRes, activitiesRes, behaviorRes] = await Promise.all([
    supabase
      .from("student_subject_notes")
      .select("grade, semester, subject_name, note")
      .eq("student_id", studentId),
    supabase
      .from("student_activities")
      .select("grade, activity_type, hours, hope_field, content")
      .eq("student_id", studentId),
    supabase
      .from("student_behavior")
      .select("grade, content")
      .eq("student_id", studentId),
  ]);

  if (notesRes.error) throw notesRes.error;
  if (activitiesRes.error) throw activitiesRes.error;
  if (behaviorRes.error) throw behaviorRes.error;

  const noteRows = notesRes.data ?? [];
  const activityRows = activitiesRes.data ?? [];
  const behaviorRows = behaviorRes.data ?? [];

  const noteChunks = buildChunksFromNotes(studentId, noteRows);
  const activityChunks = buildChunksFromActivities(studentId, activityRows);
  const behaviorChunks = buildChunksFromBehavior(studentId, behaviorRows);
  const prepared: PreparedRow[] = [
    ...noteChunks,
    ...activityChunks,
    ...behaviorChunks,
  ];

  const existingHashes = await loadExistingContentHashes(supabase, studentId);
  console.log(
    `[embed_student_record] 기존 content_sha256 ${existingHashes.size}건 로드`,
  );

  const pending: PreparedRow[] = [];
  let skippedDup = 0;
  for (const p of prepared) {
    if (existingHashes.has(p.content_sha256)) {
      skippedDup += 1;
      continue;
    }
    existingHashes.add(p.content_sha256);
    pending.push(p);
  }

  console.log(
    `[embed_student_record] 소스 청크: 세특 ${noteChunks.length} · 창체 ${activityChunks.length} · 행동특성 ${behaviorChunks.length} (합계 ${prepared.length})`,
  );

  let upserted = 0;
  let skippedFail = 0;

  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const slice = pending.slice(i, i + EMBED_BATCH_SIZE);
    const inputs = slice.map((p) => p.chunk_text);
    let vectors: number[][];
    try {
      vectors = await embedOpenAI(inputs);
    } catch (e) {
      console.error(
        `[embed_student_record] OpenAI 배치 실패 (${slice.length}건), 건별 재시도: ${e instanceof Error ? e.message : e}`,
      );
      vectors = [];
      for (const one of slice) {
        try {
          const v = await embedOpenAI([one.chunk_text]);
          vectors.push(v[0]!);
        } catch (err) {
          skippedFail += 1;
          console.error(
            `[embed_student_record] skip 임베딩: ${err instanceof Error ? err.message : err}`,
          );
          vectors.push([]);
        }
      }
    }

    const rows: {
      student_id: string;
      chunk_text: string;
      embedding: number[];
      metadata: ChunkMetadata;
      content_sha256: string;
    }[] = [];
    for (let j = 0; j < slice.length; j++) {
      const vec = vectors[j];
      if (!vec || vec.length === 0) continue;
      const s = slice[j]!;
      rows.push({
        student_id: s.student_id,
        chunk_text: s.chunk_text,
        embedding: vec,
        metadata: s.metadata,
        content_sha256: s.content_sha256,
      });
    }

    const { ok, fail } = await upsertChunkRows(supabase, rows);
    upserted += ok;
    skippedFail += fail;
  }

  console.log("");
  console.log(`적재(upsert) 완료 건수: ${upserted}`);
  console.log(`content_sha256 중복 skip: ${skippedDup}`);
  console.log(`기타 skip(실패): ${skippedFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
