import { NextRequest } from "next/server";

import { POST } from "@/app/api/mock-interview/feedback/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function anthropicSseBody(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const payload = JSON.stringify({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text },
  });
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`event: content_block_delta\ndata: ${payload}\n\n`));
      controller.close();
    },
  });
}

describe("POST /api/mock-interview/feedback coverage", () => {
  const originalFetch = global.fetch;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "anthropic-test";
    process.env.CHAT_DAILY_LIMIT = "50";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  });

  it("401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Q", answer: "A", targetUniv: "서강대" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("422 (question 누락)", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: "A", targetUniv: "서강대" }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("200 (정상 SSE 스트림 시작)", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue({
      rpc: jest.fn().mockResolvedValue({ data: { ok: true, used: 1 }, error: null }),
    } as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: anthropicSseBody("피드백 본문"),
    }) as never;

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "지원 동기?",
          answer: "학업 계획입니다.",
          targetUniv: "성균관대",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("event: chunk");
    expect(body).toContain("event: done");
  });
});
