/**
 * P1-5 생기부 학종 역량 분석 — Anthropic 스트리밍 + 역량별 섹션 파싱 (Track 2, 계산 없음)
 */

import type { HakjongSection, HakjongSectionKey } from "@/types/hakjong";

export type StudentRecordChunkRow = {
  id: number;
  chunk_text: string;
  metadata: Record<string, unknown>;
};

const HAKJONG_SYSTEM_PROMPT = `당신은 대입 학생부종합 전형 전문가입니다.
아래 학생의 생활기록부를 분석하여
학업역량 / 진로역량 / 공동체역량 세 가지 관점에서
강점과 보완점을 구체적인 근거와 함께 제시하세요.

절대 규칙:
1. 아래 [생활기록부 내용]에 있는 내용만 근거로 사용한다.
2. 없는 내용은 추측하지 않는다.
3. 각 역량별로 구체적 근거 문장을 인용한다(인용은 Markdown 블록인용 문법 > 로 표시).
4. 출처 없는 판단 문장은 쓰지 않는다.

[생활기록부 내용]
{context}`;

export function buildStudentRecordContext(chunks: StudentRecordChunkRow[]): string {
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

export function buildHakjongSystemPrompt(recordContext: string): string {
  return HAKJONG_SYSTEM_PROMPT.replace("{context}", recordContext);
}

export function buildHakjongUserMessage(targetUniv?: string | null): string {
  const u = typeof targetUniv === "string" ? targetUniv.trim() : "";
  const univLine = u.length > 0 ? u : "미지정";

  return `목표 대학(참고·맥락용, 생기부에 없으면 이에 맞춘 추측은 하지 않음): ${univLine}

아래 사용자 메시지 형식을 반드시 지켜 출력하세요. 세 역량 모두 작성합니다.

## 학업역량
(강점·보완점. 근거 인용은 > 블록으로.)

## 진로역량
(강점·보완점. 근거 인용은 > 블록으로.)

## 공동체역량
(강점·보완점. 근거 인용은 > 블록으로.)`;
}

const SECTION_MAP: Record<string, HakjongSectionKey> = {
  학업역량: "academic",
  진로역량: "career",
  공동체역량: "community",
};

/** 스트리밍 완료 후 전체 텍스트에서 ## 제목 기준 역량 블록 추출 */
export function parseHakjongSections(fullText: string): HakjongSection[] {
  const trimmed = fullText.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^##\s+/m);
  const out: HakjongSection[] = [];

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
export function anthropicStreamToHakjongSse(
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

      const sections = parseHakjongSections(fullText);
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "stop", sections }),
      );
      controller.close();
    },
  });
}

export function sseStreamHakjongNoChunks(message: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_context", sections: [] }),
      );
      controller.close();
    },
  });
}
