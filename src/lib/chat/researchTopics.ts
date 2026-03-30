/**
 * P1-8 탐구 주제 추천 — Anthropic 스트리밍 + 주제 카드 파싱 (Track 2, 계산 없음)
 */

import type {
  ResearchDifficulty,
  ResearchTopicCard,
} from "@/types/researchTopics";

export type { StudentRecordChunkRow } from "@/lib/chat/hakjongAnalyze";

function stripBracketTitle(s: string): string {
  const t = s.trim();
  const m = t.match(/^\[([^\]]+)\]\s*$/);
  return m?.[1]?.trim() ?? t.replace(/^\[|\]$/g, "").trim();
}

/** 스트리밍 완료 후 마크다운에서 ### 블록 기준 주제 카드 추출 */
export function parseResearchTopicsFromMarkdown(fullText: string): ResearchTopicCard[] {
  const trimmed = fullText.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/^###\s+/m);
  const out: ResearchTopicCard[] = [];

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi]!;
    if (!part.trim()) continue;

    const nl = part.indexOf("\n");
    const headRaw = nl >= 0 ? part.slice(0, nl).trim() : part.trim();
    const body = nl >= 0 ? part.slice(nl + 1).trim() : "";

    if (/^탐구 주제 추천/i.test(headRaw) || /^#\s*/.test(headRaw)) {
      continue;
    }

    const titleMatch = headRaw.match(/^(\d+)\.\s*(.+)$/);
    const index = titleMatch ? Number.parseInt(titleMatch[1]!, 10) : pi;
    const title = stripBracketTitle(
      titleMatch ? titleMatch[2]!.trim() : headRaw.replace(/^[\d.]+\s*/, "").trim(),
    );

    let linkedSubject = "";
    let difficulty: ResearchDifficulty | "" = "";
    let durationLabel = "";
    let direction = "";
    let univLink = "";

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("-")) continue;
      const rest = line.replace(/^-\s*/, "");
      const colon = rest.indexOf(":");
      const key = colon >= 0 ? rest.slice(0, colon).trim() : rest;
      const val = colon >= 0 ? rest.slice(colon + 1).trim() : "";

      if (/연계 교과/.test(key)) linkedSubject = val;
      else if (/난이도/.test(key)) {
        if (val.includes("상")) difficulty = "상";
        else if (val.includes("중")) difficulty = "중";
        else if (val.includes("하")) difficulty = "하";
      } else if (/소요시간|소요 시간/.test(key)) durationLabel = val;
      else if (/탐구 방향/.test(key)) direction = val;
      else if (/목표 대학 연계|연계점/.test(key)) univLink = val;
    }

    if (title.length > 0) {
      out.push({
        index: Number.isFinite(index) ? index : out.length + 1,
        title,
        linkedSubject,
        difficulty,
        durationLabel,
        direction,
        univLink,
      });
    }
  }

  return out;
}

export function buildResearchTopicsSystemPrompt(
  recordContext: string,
  guidelineContext: string,
  targetDeptLine: string,
  subjectLine: string,
): string {
  return `당신은 대입 학생부종합 전형 전문가입니다.

절대 규칙:
1. [현재 세특]과 중복되지 않는 주제만 추천한다.
2. [대학 전형 자료]의 인재상과 연계된 주제를 우선한다.
3. 실행 가능한 탐구 주제만 제안한다 (문장 대필·세특 문장 작성 금지).
4. 각 주제에 난이도(상/중/하)와 소요시간을 반드시 명시한다.
5. [대학 전형 자료]에 없는 평가요소는 사실처럼 단정하지 않는다.

[현재 세특]
${recordContext}

[대학 전형 자료]
${guidelineContext}
${targetDeptLine}
${subjectLine}

추천 형식 (5개 이상, 반드시 아래 마크다운 구조를 따른다):
## 탐구 주제 추천

### 1. [주제명]
- 연계 교과: 
- 난이도: 상/중/하
- 소요시간: N주
- 탐구 방향:
- 목표 대학 연계점:`;
}

export function buildResearchTopicsUserMessage(
  targetUniv: string,
  targetDept?: string | null,
  subject?: string | null,
): string {
  const u = typeof targetUniv === "string" ? targetUniv.trim() : "";
  const d = typeof targetDept === "string" ? targetDept.trim() : "";
  const s = typeof subject === "string" ? subject.trim() : "";
  return `목표 대학: ${u.length > 0 ? u : "미지정"}
목표 학과(참고): ${d.length > 0 ? d : "미지정"}
연계 교과목(참고): ${s.length > 0 ? s : "미지정"}

위 [현재 세특]에 이미 드러난 탐구·수행·세특 주제와 겹치지 않게, 시스템이 제시한 추천 형식으로 5개 이상 작성하세요.`;
}

function sseLine(
  enc: TextEncoder,
  event: string,
  data: Record<string, unknown>,
): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Anthropic Messages SSE → 앱 표준 SSE (event: chunk / done with topic cards) */
export function anthropicStreamToResearchSse(
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

      const topics = parseResearchTopicsFromMarkdown(fullText);
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "stop", topics }),
      );
      controller.close();
    },
  });
}

export function sseStreamResearchNoStudentChunks(
  message: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_context", topics: [] }),
      );
      controller.close();
    },
  });
}

export function sseStreamResearchNoGuidelines(
  message: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseLine(enc, "chunk", { text: message }));
      controller.enqueue(
        sseLine(enc, "done", { finish_reason: "no_guidelines", topics: [] }),
      );
      controller.close();
    },
  });
}
