import { NextResponse } from "next/server";
import { z } from "zod";

import {
  anthropicStreamToResearchSse,
  buildResearchTopicsSystemPrompt,
  buildResearchTopicsUserMessage,
  sseStreamResearchNoGuidelines,
  sseStreamResearchNoStudentChunks,
  type StudentRecordChunkRow,
} from "@/lib/chat/researchTopics";
import { buildStudentRecordContext } from "@/lib/chat/hakjongAnalyze";
import {
  buildReferenceContext,
  embedQuery,
  getChatDailyLimit,
  getChatSimilarityThreshold,
  getGuidelineMatchParams,
  type GuidelineMatchRow,
} from "@/lib/chat/ragChat";
import {
  getStudentRole,
  resolveRecordStudentId,
} from "@/lib/student-record/recordStudentContext";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  studentId: z.string().uuid().optional(),
  targetUniv: z
    .string()
    .min(1, "targetUniv는 필수입니다.")
    .max(120)
    .transform((s) => s.trim()),
  targetDept: z
    .string()
    .max(200)
    .optional()
    .transform((s) =>
      typeof s === "string" && s.trim().length > 0 ? s.trim() : undefined,
    ),
  subject: z
    .string()
    .max(200)
    .optional()
    .transform((s) =>
      typeof s === "string" && s.trim().length > 0 ? s.trim() : undefined,
    ),
});

function getThrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isSeteukChunk(row: { metadata?: Record<string, unknown> | null }): boolean {
  const m = row.metadata;
  return m != null && typeof m === "object" && m.section === "세특";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
      },
      { status: 401 },
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." },
      },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(rawJson);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: msg || "요청 형식이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

  const role = await getStudentRole(supabase, user.id);
  const targetStudentId = resolveRecordStudentId(
    user.id,
    role,
    parsed.data.studentId ?? undefined,
  );

  const dailyLimit = getChatDailyLimit();
  const { data: quotaRaw, error: quotaErr } = await supabase.rpc(
    "try_consume_chat_quota",
    { p_limit: dailyLimit },
  );

  if (quotaErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: quotaErr.message },
      },
      { status: 500 },
    );
  }

  const quota = quotaRaw as { ok?: boolean; used?: number; code?: string } | null;
  if (!quota?.ok) {
    const isLimit = quota?.code === "RATE_LIMIT";
    return NextResponse.json(
      {
        data: null,
        error: {
          code: isLimit ? "RATE_LIMIT" : "INTERNAL_ERROR",
          message: isLimit
            ? `일일 채팅 호출 한도(${dailyLimit}회)에 도달했습니다.`
            : "호출 한도를 확인할 수 없습니다.",
        },
      },
      { status: isLimit ? 429 : 500 },
    );
  }

  const { targetUniv, targetDept, subject } = parsed.data;

  const { data: chunkRows, error: chunkErr } = await supabase
    .from("student_record_chunks")
    .select("id, chunk_text, metadata")
    .eq("student_id", targetStudentId)
    .order("id", { ascending: true });

  if (chunkErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: chunkErr.message },
      },
      { status: 500 },
    );
  }

  const allRows = (chunkRows ?? []) as StudentRecordChunkRow[];
  const chunks = allRows.filter(isSeteukChunk);
  if (chunks.length === 0) {
    const out = sseStreamResearchNoStudentChunks(
      "세특 청크(student_record_chunks, metadata.section=세특)가 없습니다. 생활기록부 세특 입력 후 임베딩 적재(embed_student_record)를 진행한 뒤 다시 시도해 주세요.",
    );
    return new Response(out, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  let embedding: number[];
  try {
    embedding = await embedQuery(
      `${targetUniv} 학생부종합 인재상 역량 학업 진로 교과`,
    );
  } catch (e) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: getThrownMessage(e) },
      },
      { status: 500 },
    );
  }

  const similarityThreshold = getChatSimilarityThreshold();
  const { match_count, filter } = getGuidelineMatchParams(targetUniv, 2027);

  const { data: rows, error: matchErr } = await supabase.rpc("match_guideline_chunks", {
    query_embedding: embedding,
    match_count,
    filter,
    match_threshold: similarityThreshold,
  });

  if (matchErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: matchErr.message },
      },
      { status: 500 },
    );
  }

  const guidelineChunks = (rows ?? []) as GuidelineMatchRow[];
  if (guidelineChunks.length === 0) {
    const out = sseStreamResearchNoGuidelines(
      `목표 대학「${targetUniv}」에 해당하는 전형계획 청크를 유사도 기준으로 찾지 못했습니다. CHAT_SIMILARITY_THRESHOLD를 낮추거나, 해당 대학 요강이 guideline_chunks에 적재되어 있는지 확인해 주세요.`,
    );
    return new Response(out, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "ANTHROPIC_API_KEY is not configured",
        },
      },
      { status: 500 },
    );
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";

  const recordContext = buildStudentRecordContext(chunks);
  const guidelineContext = buildReferenceContext(guidelineChunks);

  const targetDeptLine =
    targetDept && targetDept.length > 0
      ? `\n[추가 맥락] 목표 학과: ${targetDept}`
      : "";
  const subjectLine =
    subject && subject.length > 0
      ? `\n[추가 맥락] 희망 연계 교과목: ${subject}`
      : "";

  const system = buildResearchTopicsSystemPrompt(
    recordContext,
    guidelineContext,
    targetDeptLine,
    subjectLine,
  );
  const userContent = buildResearchTopicsUserMessage(targetUniv, targetDept, subject);

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      stream: true,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: errText.slice(0, 800),
        },
      },
      { status: 502 },
    );
  }

  if (!anthropicRes.body) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Anthropic 응답 스트림이 비어 있습니다.",
        },
      },
      { status: 502 },
    );
  }

  const out = anthropicStreamToResearchSse(anthropicRes.body);

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
