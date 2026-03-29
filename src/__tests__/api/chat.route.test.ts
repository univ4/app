/**
 * POST /api/chat — 요강 RAG 스트리밍
 */
import { POST } from "@/app/api/chat/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function mockUnauthedClient() {
  mockCreateClient.mockResolvedValue({} as never);
  mockGetAuthUser.mockResolvedValue(null);
}

function mockAuthedClient(chain: Record<string, unknown>) {
  mockCreateClient.mockResolvedValue({
    ...chain,
  } as never);
  mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
}

describe("POST /api/chat", () => {
  const origFetch = global.fetch;
  const origOpenAi = process.env.OPENAI_API_KEY;
  const origAnthropic = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "anthropic-test";
    process.env.CHAT_DAILY_LIMIT = "50";
    process.env.CHAT_SIMILARITY_THRESHOLD = "0.55";
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env.OPENAI_API_KEY = origOpenAi;
    process.env.ANTHROPIC_API_KEY = origAnthropic;
  });

  it("비로그인 시 401", async () => {
    mockUnauthedClient();
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "안녕" }),
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("본문 검증 실패 시 400", async () => {
    mockAuthedClient({
      rpc: jest.fn(),
    });
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("일일 한도 초과 시 429", async () => {
    mockAuthedClient({
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === "try_consume_chat_quota") {
          return Promise.resolve({
            data: { ok: false, used: 50, code: "RATE_LIMIT" },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "테스트" }),
      }),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error?.code).toBe("RATE_LIMIT");
  });

  it("검색 청크 0건이면 SSE로 확인 불가 (Claude 미호출)", async () => {
    const rpc = jest.fn().mockImplementation((name: string) => {
      if (name === "try_consume_chat_quota") {
        return Promise.resolve({
          data: { ok: true, used: 1 },
          error: null,
        });
      }
      if (name === "match_guideline_chunks") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockAuthedClient({ rpc });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: new Array(1536).fill(0.01), index: 0 }],
      }),
    }) as never;

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "없는 질문" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "match_guideline_chunks",
      expect.objectContaining({
        match_count: 5,
        filter: {},
        match_threshold: 0.55,
      }),
    );
    const text = await res.text();
    expect(text).toContain("확인 불가");
    expect(text).toContain("event: done");
  });

  it("청크가 있으면 Anthropic 스트림을 SSE로 전달", async () => {
    const chunkRow = {
      id: 1,
      chunk_text: "본문",
      metadata: {
        univ_name: "서강대",
        year: 2027,
        admission_type: "논술전형",
        page_section: "p.3",
        citation_hint: "서강대/2027/논술전형/p.3",
      },
      similarity: 0.9,
    };

    const rpc = jest.fn().mockImplementation((name: string) => {
      if (name === "try_consume_chat_quota") {
        return Promise.resolve({
          data: { ok: true, used: 2 },
          error: null,
        });
      }
      if (name === "match_guideline_chunks") {
        return Promise.resolve({ data: [chunkRow], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockAuthedClient({ rpc });

    const ssePiece =
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"답"}}\n\n';

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0.02), index: 0 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(ssePiece));
            controller.close();
          },
        }),
      }) as never;

    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "질문", univName: "서강", year: 2027 }),
      }),
    );

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "match_guideline_chunks",
      expect.objectContaining({
        match_count: 10,
        filter: { univ_name: "서강", year: 2027 },
        match_threshold: 0.55,
      }),
    );

    const out = await res.text();
    expect(out).toContain("event: chunk");
    expect(out).toContain('"text":"답"');
    expect(out).toContain("event: done");
    expect(out).toContain("서강대");
  });
});
