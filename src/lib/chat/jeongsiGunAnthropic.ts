type AnthropicContentBlock = { type?: string; text?: string };

/**
 * Anthropic Messages API 비스트리밍 응답에서 텍스트 추출.
 */
export function extractAnthropicMessageText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const content = (json as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content as AnthropicContentBlock[]) {
    if (block?.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  const t = parts.join("").trim();
  return t.length > 0 ? t : null;
}
