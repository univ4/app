import { NextResponse } from "next/server";
import { z } from "zod";

import {
  anthropicMessagesStreamToSse,
  buildRagSystemPrompt,
  buildReferenceContext,
  embedQuery,
  getChatDailyLimit,
  getChatSimilarityThreshold,
  getGuidelineMatchParams,
  rowToCitation,
  sseStreamForUnavailable,
  type GuidelineMatchRow,
} from "@/lib/chat/ragChat";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().min(1).max(12000),
  univName: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).optional(),
  ),
  year: z.number().int().min(2000).max(2100).optional(),
});

function getThrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
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
        error: { code: "VALIDATION_ERROR", message: msg || "요청 형식이 올바르지 않습니다." },
      },
      { status: 400 },
    );
  }

  const { message, univName, year } = parsed.data;
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

  let embedding: number[];
  try {
    embedding = await embedQuery(message);
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
  const { match_count, filter } = getGuidelineMatchParams(univName, year);

  const { data: rows, error: matchErr } = await supabase.rpc("match_guideline_chunks", {
    query_embedding: embedding,
    match_count,
    filter,
    match_threshold: similarityThreshold,
  });

  console.log(
    "[RAG] rows count:",
    rows?.length,
    "threshold:",
    similarityThreshold,
    "filter:",
    filter,
  );

  if (matchErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: matchErr.message },
      },
      { status: 500 },
    );
  }

  const chunks = (rows ?? []) as GuidelineMatchRow[];
  if (chunks.length === 0) {
    return new Response(sseStreamForUnavailable(), {
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

  const refContext = buildReferenceContext(chunks);
  const system = buildRagSystemPrompt(refContext);
  const userContent = message.trim();
  const citations = chunks.map(rowToCitation);

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
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
        error: { code: "INTERNAL_ERROR", message: "Anthropic 응답 스트림이 비어 있습니다." },
      },
      { status: 502 },
    );
  }

  const out = anthropicMessagesStreamToSse(anthropicRes.body, citations);

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
