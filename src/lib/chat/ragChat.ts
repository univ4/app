/**
 * 요강 RAG 챗봇 — OpenAI 임베딩 + Anthropic 스트리밍 (Track 2, 계산 없음)
 */

/** `match_guideline_chunks` RPC 한 행 — 출처 필드는 `metadata`(univ_name, year, admission_type 등)에서 해석 */
export type GuidelineMatchRow = {
  id: number;
  chunk_text: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type CitationPayload = {
  university_name: string;
  admission_year: number;
  admission_type: string;
  chunk_id: number;
  citation_hint: string;
  page_section?: string;
};

export function getChatDailyLimit(): number {
  const raw = process.env.CHAT_DAILY_LIMIT?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 50;
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 10000);
}

/** 코사인 유사도 하한 (0~1). 미설정·비정상 값 시 0.55. */
export function getChatSimilarityThreshold(): number {
  const raw = process.env.CHAT_SIMILARITY_THRESHOLD?.trim();
  const n = raw ? Number.parseFloat(raw) : 0.55;
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.55;
  return n;
}

/**
 * `match_guideline_chunks` RPC `filter` 인자 — `guideline_chunks.metadata` 키와 동일
 * (`scripts/ingest/embed_and_store.ts`: univ_name, year).
 */
export function buildMatchGuidelineChunksFilter(
  univName?: string | null,
  year?: number | null,
): Record<string, string | number> {
  const f: Record<string, string | number> = {};
  const u = typeof univName === "string" ? univName.trim() : "";
  if (u.length > 0) {
    f.univ_name = u;
  }
  if (year != null && Number.isFinite(year)) {
    f.year = year;
  }
  return f;
}

/**
 * `match_guideline_chunks`용 상위 k·필터.
 * 대학 스코프(`univName` 비어 있지 않음)일 때만 `univ_name` 필터를 넣어 해당 대학 청크만 검색하고 match_count=10.
 * 스코프 없음일 때 match_count=5.
 */
export function getGuidelineMatchParams(
  univName?: string | null,
  year?: number | null,
): { match_count: number; filter: Record<string, string | number> } {
  const u = typeof univName === "string" ? univName.trim() : "";
  const scoped = u.length > 0;
  return {
    match_count: scoped ? 10 : 5,
    filter: buildMatchGuidelineChunksFilter(scoped ? u : undefined, year),
  };
}

const RAG_SYSTEM_PROMPT_TEMPLATE = `당신은 대입 전형계획 자료 전문 안내 시스템입니다.

절대 규칙 (위반 금지):
1. 아래 [참고 자료]에 명시된 내용만 답변한다.
2. [참고 자료]에 없는 내용은 추론하거나 일반 지식으로 보완하지 않는다.
3. 부분적으로만 자료가 있어도, 없는 부분은 "자료 없음"으로 명시한다.
4. 모든 답변 끝에 출처를 반드시 표기한다.
   형식: [출처: {대학명} {연도}학년도 입학전형 시행계획 · {섹션}]
5. [참고 자료]로 답할 수 없으면 아래 형식으로만 응답한다:
   "현재 보유한 자료에서 해당 내용을 확인할 수 없습니다.
    정확한 정보는 해당 대학 입학처에 직접 문의하시기 바랍니다.
    (보유 자료 범위: {보유 대학 목록})"

보유 자료 범위:
- 18개 대학 2027학년도 전형계획 (서울대, 연세대, 고려대, 성균관대, 한양대,
  서강대, 중앙대, 경희대, 서울시립대, 건국대, 동국대, 홍익대, 아주대,
  세종대, 광운대, 국민대, 숭실대 + 정시자료)
- 수록 내용: 전형별 모집인원, 수능최저, 반영교과, 전형 방법

[참고 자료]
{context}`;

export async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model =
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
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
    throw new Error("OpenAI embeddings response format error");
  }

  const arr = (json as { data: { embedding: number[]; index: number }[] }).data;
  arr.sort((a, b) => a.index - b.index);
  const emb = arr[0]?.embedding;
  if (!emb?.length) {
    throw new Error("OpenAI embeddings: empty vector");
  }
  return emb;
}

function pickString(m: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function metaAdmissionYear(m: Record<string, unknown>): number {
  for (const k of ["year", "admission_year"] as const) {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  return 0;
}

export function rowToCitation(row: GuidelineMatchRow): CitationPayload {
  const m = row.metadata ?? {};
  const university_name =
    pickString(m, "univ_name", "university_name") ?? "(대학명 미상)";
  const admission_year = metaAdmissionYear(m);
  const admission_type = pickString(m, "admission_type") ?? "";
  const hint =
    pickString(m, "citation_hint") ??
    [
      university_name,
      admission_year > 0 ? String(admission_year) : "연도미상",
      admission_type,
      pickString(m, "page_section") ?? "(섹션 미상)",
    ].join("/");

  return {
    university_name,
    admission_year,
    admission_type,
    chunk_id: row.id,
    citation_hint: hint,
    page_section: pickString(m, "page_section"),
  };
}

export function buildRagSystemPrompt(context: string): string {
  return RAG_SYSTEM_PROMPT_TEMPLATE.replace("{context}", context);
}

/** 시스템 프롬프트 [참고 자료] 블록용 — 사용자 질문은 별도 user 메시지로 전달 */
export function buildReferenceContext(chunks: GuidelineMatchRow[]): string {
  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const row = chunks[i]!;
    const cite = rowToCitation(row);
    parts.push(
      `--- 청크 ${i + 1} ---`,
      `출처(citation_hint): ${cite.citation_hint}`,
      row.chunk_text.trim(),
    );
  }
  return parts.join("\n");
}

function sseLine(
  enc: TextEncoder,
  event: string,
  data: Record<string, unknown>,
): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Anthropic Messages SSE → 앱 표준 SSE (event: chunk / done) */
export function anthropicMessagesStreamToSse(
  anthropicBody: ReadableStream<Uint8Array>,
  citations: CitationPayload[],
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  let carry = "";
  let dataLines: string[] = [];

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

      controller.enqueue(sseLine(enc, "done", { finish_reason: "stop", citations }));
      controller.close();
    },
  });
}

export function sseStreamForUnavailable(): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const citations: CitationPayload[] = [];
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        enc.encode(
          `event: chunk\ndata: ${JSON.stringify({ text: "확인 불가" })}\n\n`,
        ),
      );
      controller.enqueue(
        enc.encode(
          `event: done\ndata: ${JSON.stringify({
            finish_reason: "no_context",
            citations,
          })}\n\n`,
        ),
      );
      controller.close();
    },
  });
}
