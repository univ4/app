/**
 * POST /api/student-record/analyze — P1-5 학종 역량 분석 SSE
 */
import { POST } from "@/app/api/student-record/analyze/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRole: jest.fn(),
  resolveRecordStudentId: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  getStudentRole,
  resolveRecordStudentId,
} from "@/lib/student-record/recordStudentContext";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockGetStudentRole = getStudentRole as jest.MockedFunction<typeof getStudentRole>;
const mockResolveRecordStudentId = resolveRecordStudentId as jest.MockedFunction<
  typeof resolveRecordStudentId
>;

describe("POST /api/student-record/analyze", () => {
  const origFetch = global.fetch;
  const origAnthropic = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "anthropic-test";
    process.env.CHAT_DAILY_LIMIT = "50";
    mockGetStudentRole.mockResolvedValue("viewer");
    mockResolveRecordStudentId.mockImplementation((uid: string) => uid);
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env.ANTHROPIC_API_KEY = origAnthropic;
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/student-record/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("청크가 있으면 Anthropic 스트림을 SSE로 전달", async () => {
    const chunkRow = {
      id: 1,
      chunk_text: "수학 세특 본문",
      metadata: { section: "세특", grade: 2 },
    };

    const fromChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [chunkRow], error: null }),
    };

    mockCreateClient.mockResolvedValue({
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === "try_consume_chat_quota") {
          return Promise.resolve({
            data: { ok: true, used: 1 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: jest.fn(() => fromChain),
    } as never);

    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

    const deltaPayload = JSON.stringify({
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "text_delta",
        text: "## 학업역량\nA\n## 진로역량\nB\n## 공동체역량\nC\n",
      },
    });
    const ssePiece = `event: content_block_delta\ndata: ${deltaPayload}\n\n`;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePiece));
          controller.close();
        },
      }),
    }) as never;

    const res = await POST(
      new Request("http://localhost/api/student-record/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(fromChain.eq).toHaveBeenCalledWith("student_id", "user-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const out = await res.text();
    expect(out).toContain("event: chunk");
    expect(out).toContain("event: done");
    expect(out).toContain("sections");
  });
});
