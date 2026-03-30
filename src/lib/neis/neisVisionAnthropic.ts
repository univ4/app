const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export const NEIS_VISION_SYSTEM_PROMPT = `나이스(NEIS) 학생 성적 확인서 이미지에서
성적 데이터를 추출하세요.

추출 형식 (JSON만 반환):
{
  grade: 학년(1/2/3),
  semester: 학기(1/2),
  subjects: [
    {
      subjectName: 과목명,
      grade: 등급(1~9),
      rawScore: 원점수,
      classAvg: 과목평균,
      stdDev: 표준편차,
      creditUnit: 단위수,
      studentCount: 수강자수,
      achievementLevel: 성취도(A/B/C/D/E, nullable)
    }
  ]
}

주의:
- JSON 외 다른 텍스트 출력 금지
- 확인 불가능한 필드는 null
- 등급이 없는 과목(체육 등)은 grade: null`;

export function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as Record<string, unknown>).content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type === "text" && typeof b.text === "string") {
      parts.push(b.text);
    }
  }
  return parts.join("\n").trim();
}

/** 코드펜스 제거 후 최상위 JSON 객체 `{...}` 문자열 추출 */
export function sliceJsonObject(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```/m.exec(t);
  const body = (fence?.[1] ?? t).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}

export async function callNeisVisionExtract(params: {
  apiKey: string;
  model: string;
  base64: string;
  mediaType: "image/png" | "image/jpeg";
}): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 16384,
      system: NEIS_VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: params.mediaType,
                data: params.base64,
              },
            },
            {
              type: "text",
              text: "이 이미지를 읽고 위 시스템 지시에 맞는 JSON 객체만 출력하세요.",
            },
          ],
        },
      ],
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic HTTP ${res.status}: ${rawBody.slice(0, 1200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error(`Anthropic 응답 JSON 파싱 실패: ${rawBody.slice(0, 500)}`);
  }

  const text = extractAssistantText(parsed);
  if (!text) {
    throw new Error(
      `Anthropic 응답에 텍스트 블록이 없습니다: ${rawBody.slice(0, 500)}`,
    );
  }
  return text;
}
