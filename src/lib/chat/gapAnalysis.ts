/**
 * P1-4 세특 Gap Analysis — Anthropic 스트리밍 + 섹션 파싱 (Track 2, 계산 없음)
 */

import type { GapAnalysisSection, GapAnalysisSectionKey } from "@/types/gapAnalysis";

export type { StudentRecordChunkRow } from "@/lib/chat/hakjongAnalyze";

export function buildGapAnalysisSystemPrompt(
  recordContext: string,
  guidelineContext: string,
  remainingWeeks: number,
): string {
  return `당신은 대입 학생부종합 전형 전문가입니다.

절대 규칙:
1. [학생 세특]과 [대학 전형 자료]에 있는 내용만 근거로 사용한다.
2. 없는 내용은 추측하지 않는다.
3. 대필이나 문장 작성 금지
4. 주제/근거/실행순서만 제시한다.

[학생 세특]
${recordContext}

[대학 전형 자료]
${guidelineContext}

분석 형식:
## 강점
[현재 세특에서 해당 대학 평가요소와 일치하는 부분]

## 보완점
[부족한 부분과 구체적 근거]

## 액션 플랜 (${remainingWeeks}주 기준)
[주차별 실행 가능한 탐구/수행평가 주제 제안]
- 문장 대필 없이 주제와 방향만 제시
- 난이도: 상/중/하 표시`;
}

export function buildGapAnalysisUserMessage(targetUniv: string): string {
  const u = typeof targetUniv === "string" ? targetUniv.trim() : "";
  return `목표 대학: ${u.length > 0 ? u : "미지정"}

위 [학생 세특]과 [대학 전형 자료]만을 근거로, 시스템 분석 형식(## 강점 / ## 보완점 / ## 액션 플랜)을 따르세요.`;
}

function mapSectionHead(
  head: string,
): GapAnalysisSectionKey | undefined {
  const h = head.trim();
  if (h === "강점" || h.startsWith("강점")) return "strengths";
  if (h === "보완점" || h.startsWith("보완")) return "gaps";
  if (h.includes("액션 플랜") || h.startsWith("액션")) return "actions";
  return undefined;
}

/** 스트리밍 완료 후 전체 텍스트에서 ## 제목 기준 블록 추출 */
export function parseGapAnalysisSections(fullText: string): GapAnalysisSection[] {
  const trimmed = fullText.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^##\s+/m);
  const out: GapAnalysisSection[] = [];

  for (const part of parts) {
    const lineBreak = part.indexOf("\n");
    const head = lineBreak >= 0 ? part.slice(0, lineBreak).trim() : part.trim();
    const body = lineBreak >= 0 ? part.slice(lineBreak + 1).trim() : "";
    const key = mapSectionHead(head);
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

/** Anthropic Messages SSE → 앱 표준 SSE (event: chunk / done with gap sections) */
export function anthropicStreamToGapSse(
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

      const sections = parseGapAnalysisSections(fullText);
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "stop", sections }),
      );
      controller.close();
    },
  });
}

export function sseStreamGapNoStudentChunks(
  message: string,
): ReadableStream<Uint8Array> {
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

export function sseStreamGapNoGuidelines(
  message: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_guidelines", sections: [] }),
      );
      controller.close();
    },
  });
}
