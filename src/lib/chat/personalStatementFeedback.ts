/**
 * P1-6 자기소개서 코치 — Anthropic 스트리밍 + 역량별 섹션 파싱 (Track 2)
 */

import type {
  PersonalStatementSection,
  PersonalStatementSectionKey,
} from "@/types/personalStatement";

import { buildStudentRecordContext } from "./hakjongAnalyze";

export { buildStudentRecordContext };

export function buildPersonalStatementSystemPrompt(
  recordContext: string,
  maxLength: number,
): string {
  return `당신은 대입 자기소개서 코치입니다.

절대 규칙:
1. [생활기록부]에 있는 내용만 근거로 피드백한다.
2. 문장 대필 금지 — 방향과 개선점만 제시한다.
3. 평가요소(학업역량/진로역량/공동체역량) 기준으로 피드백한다.
4. 글자수 ${maxLength}자 제한 준수 여부를 확인한다.

[생활기록부]
${recordContext}

피드백 형식(반드시 아래 제목을 사용):
## 글자수 확인
## 학업역량 관련 피드백
## 진로역량 관련 피드백
## 공동체역량 관련 피드백
## 개선 제안`;
}

export function buildPersonalStatementUserMessage(input: {
  targetUniv: string;
  statementUniversity: string;
  questionNumber: number;
  questionText: string;
  draftText: string;
}): string {
  const u =
    input.targetUniv.trim() ||
    input.statementUniversity.trim() ||
    "미지정";

  return `목표 대학(참고): ${u}
저장된 자소서 대학 필드: ${input.statementUniversity.trim() || "미지정"}
문항 번호: ${input.questionNumber}
문항 내용:
${input.questionText.trim()}

학생 초안:
${input.draftText.trim()}

위 초안에 대해 시스템 규칙과 피드백 형식을 지켜 답하세요. 생기부에 없는 사실은 추측하지 마세요.`;
}

const SECTION_MAP: Record<string, PersonalStatementSectionKey> = {
  "글자수 확인": "char_count",
  "학업역량 관련 피드백": "academic",
  "진로역량 관련 피드백": "career",
  "공동체역량 관련 피드백": "community",
  "개선 제안": "suggestions",
};

export function parsePersonalStatementSections(fullText: string): PersonalStatementSection[] {
  const trimmed = fullText.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^##\s+/m);
  const out: PersonalStatementSection[] = [];

  for (const part of parts) {
    const lineBreak = part.indexOf("\n");
    const head = lineBreak >= 0 ? part.slice(0, lineBreak).trim() : part.trim();
    const body = lineBreak >= 0 ? part.slice(lineBreak + 1).trim() : "";
    const key = SECTION_MAP[head];
    if (key) {
      out.push({ key, title: head, content: body });
    }
  }

  return out;
}

function sseLine(
  enc: TextEncoder,
  event: string,
  data: Record<string, unknown>,
): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Anthropic Messages SSE → 앱 표준 SSE (event: chunk / done with sections) */
export function anthropicStreamToPersonalStatementSse(
  anthropicBody: ReadableStream<Uint8Array>,
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

      const sections = parsePersonalStatementSections(fullText);
      controller.enqueue(
        sseLine(enc, "done", {
          finish_reason: "stop",
          sections,
        }),
      );
      controller.close();
    },
  });
}

export function sseStreamPersonalStatementNoChunks(
  message: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", {
          finish_reason: "no_context",
          sections: [],
        }),
      );
      controller.close();
    },
  });
}
