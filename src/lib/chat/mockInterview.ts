/**
 * P1-9 모의 면접 코치 — Anthropic 스트리밍 (Track 2)
 */

import type { InterviewType } from "@/types/mockInterview";
import type { StudentRecordChunkRow } from "@/lib/chat/hakjongAnalyze";

export type { StudentRecordChunkRow };

function sseLine(
  enc: TextEncoder,
  event: string,
  data: Record<string, unknown>,
): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function buildMockInterviewRecordContext(chunks: StudentRecordChunkRow[]): string {
  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const row = chunks[i]!;
    const meta = row.metadata ?? {};
    const section =
      typeof meta.section === "string" ? meta.section : "기타";
    parts.push(
      `--- 청크 ${i + 1} (구분: ${section}) ---`,
      row.chunk_text.trim(),
    );
  }
  return parts.join("\n");
}

export function buildMockInterviewQuestionsSystemPrompt(
  recordContext: string,
  guidelineContext: string,
  interviewType: InterviewType,
): string {
  return `당신은 대입 면접 전문가입니다.

절대 규칙:
1. [생활기록부]에 기반한 서류 기반 질문 생성
2. 없는 내용으로 질문 금지
3. ${interviewType} 유형에 맞는 질문 형식 사용

[생활기록부]
${recordContext}

[대학 전형 자료]
${guidelineContext}

질문 형식 (5개 이상):
## 면접 질문 목록

### Q1. [질문]
- 유형: 서류기반/인성/전공적합성
- 핵심 평가요소:
- 예상 답변 방향:`;
}

export function buildMockInterviewQuestionsUserMessage(targetUniv: string): string {
  const u = typeof targetUniv === "string" ? targetUniv.trim() : "";
  return `목표 대학: ${u.length > 0 ? u : "미지정"}

위 형식으로 면접 질문을 5개 이상 작성하세요. 질문은 생활기록부에 근거가 있는 내용만 다룹니다.`;
}

export function buildMockInterviewFeedbackSystemPrompt(): string {
  return `당신은 대입 면접 평가 전문가입니다.

아래 답변을 평가하고 피드백을 제공하세요.

피드백 형식:
## 강점
## 보완점
## 개선 제안`;
}

export function buildMockInterviewFeedbackUserMessage(
  targetUniv: string,
  question: string,
  answer: string,
): string {
  return `목표 대학: ${targetUniv.trim()}

[면접 질문]
${question.trim()}

[지원자 답변]
${answer.trim()}`;
}

type DonePayload = Record<string, unknown>;

/** Anthropic Messages SSE → 앱 표준 SSE (event: chunk / done) */
export function anthropicStreamToTextSse(
  anthropicBody: ReadableStream<Uint8Array>,
  buildDonePayload: (fullText: string) => DonePayload,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  let carry = "";
  let dataLines: string[] = [];
  let fullText = "";

  function flushData(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (dataLines.length === 0) return;
    const payload = dataLines.join("\n");
    dataLines = [];
    if (!payload) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return;
    const t = (parsed as { type: string }).type;

    if (t === "error") {
      const err = (parsed as { error?: { message?: string } }).error;
      throw new Error(err?.message || "Anthropic stream error");
    }

    if (t === "message_stop" || t === "ping") {
      return;
    }

    if (t === "content_block_delta") {
      const delta = (parsed as { delta?: { type?: string; text?: string } }).delta;
      if (
        delta?.type === "text_delta" &&
        typeof delta.text === "string" &&
        delta.text.length > 0
      ) {
        fullText += delta.text;
        controller.enqueue(sseLine(enc, "chunk", { text: delta.text }));
      }
    }
  }

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += dec.decode(value, { stream: true });

          let nl: number;
          while ((nl = carry.indexOf("\n")) >= 0) {
            let line = carry.slice(0, nl);
            carry = carry.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (line === "") {
              try {
                flushData(controller);
              } catch (e) {
                controller.error(e instanceof Error ? e : new Error(String(e)));
                return;
              }
              continue;
            }
            if (line.startsWith("event:")) {
              continue;
            }
            if (line.startsWith("data:")) {
              dataLines.push(line.slice("data:".length).trimStart());
            }
          }
        }
        if (dataLines.length) {
          try {
            flushData(controller);
          } catch (e) {
            controller.error(e instanceof Error ? e : new Error(String(e)));
            return;
          }
        }
      } catch (e) {
        controller.error(e instanceof Error ? e : new Error(String(e)));
        return;
      } finally {
        reader.releaseLock();
      }

      controller.enqueue(
        sseLine(enc, "done", buildDonePayload(fullText)),
      );
      controller.close();
    },
  });
}

export function sseStreamMockInterviewNoChunks(message: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_context" }),
      );
      controller.close();
    },
  });
}

export function sseStreamMockInterviewNoGuidelines(
  message: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_guidelines" }),
      );
      controller.close();
    },
  });
}

/** `### Q1.` … 블록 단위로 분리 (스트리밍 완료 후 UI용) */
export function parseMockInterviewQuestionBlocks(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/(?=^###\s*Q\d+)/m);
  const out: string[] = [];
  for (const part of parts) {
    const p = part.trim();
    if (/^###\s*Q\d+/m.test(p)) {
      out.push(p);
    }
  }
  return out;
}
