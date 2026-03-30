import { NextResponse } from "next/server";
import { z } from "zod";

import {
  anthropicStreamToTextSse,
  buildMockInterviewFeedbackSystemPrompt,
  buildMockInterviewFeedbackUserMessage,
} from "@/lib/chat/mockInterview";
import { getChatDailyLimit } from "@/lib/chat/ragChat";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  question: z.string().min(1, "question은 필수입니다.").max(50000),
  answer: z.string().max(50000).default(""),
  targetUniv: z
    .string()
    .min(1, "targetUniv는 필수입니다.")
    .max(120)
    .transform((s) => s.trim()),
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
        error: {
          code: "VALIDATION_ERROR",
          message: msg || "요청 형식이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

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

  const { question, answer, targetUniv } = parsed.data;

  const system = buildMockInterviewFeedbackSystemPrompt();
  const userContent = buildMockInterviewFeedbackUserMessage(targetUniv, question, answer);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
  } catch (e) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: getThrownMessage(e) },
      },
      { status: 502 },
    );
  }

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

  const out = anthropicStreamToTextSse(anthropicRes.body, () => ({
    finish_reason: "stop",
  }));

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
