import { NextRequest } from "next/server";

import { POST } from "@/app/api/mock-interview/questions/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRole: jest.fn(),
  resolveRecordStudentId: jest.fn(),
}));

jest.mock("@/lib/chat/ragChat", () => {
  const actual = jest.requireActual<typeof import("@/lib/chat/ragChat")>("@/lib/chat/ragChat");
  return {
    ...actual,
    embedQuery: jest.fn().mockResolvedValue(Array.from({ length: 8 }, () => 0.01)),
  };
});

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getStudentRole, resolveRecordStudentId } from "@/lib/student-record/recordStudentContext";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockGetStudentRole = getStudentRole as jest.MockedFunction<typeof getStudentRole>;
const mockResolveRecordStudentId = resolveRecordStudentId as jest.MockedFunction<
  typeof resolveRecordStudentId
>;

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

function buildSupabaseForSuccess() {
  const studentChunkChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: [{ id: 1, chunk_text: "세특 본문", metadata: { section: "세특" } }],
      error: null,
    }),
  };

  return {
    from: jest.fn((table: string) => {
      if (table === "student_record_chunks") return studentChunkChain;
      throw new Error(`unexpected table: ${table}`);
    }),
    rpc: jest.fn().mockImplementation((name: string) => {
      if (name === "try_consume_chat_quota") {
        return Promise.resolve({ data: { ok: true, used: 1 }, error: null });
      }
      if (name === "match_guideline_chunks") {
        return Promise.resolve({
          data: [{ id: 10, chunk_text: "요강 본문", metadata: { univ_name: "서강대", year: 2027 } }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };
}

describe("POST /api/mock-interview/questions coverage", () => {
  const originalFetch = global.fetch;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStudentRole.mockResolvedValue("viewer");
    mockResolveRecordStudentId.mockImplementation((uid: string) => uid);
    process.env.ANTHROPIC_API_KEY = "anthropic-test";
    process.env.CHAT_DAILY_LIMIT = "50";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  });

  it("401 (인증 없음)", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대", interviewType: "MMI" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("422 (targetUniv 누락)", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewType: "MMI" }),
      }),
    );

    expect(res.status).toBe(422);
  });

  it("200 (정상 SSE 스트림 시작)", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue(buildSupabaseForSuccess() as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: anthropicSseBody("면접 질문 1"),
    }) as never;

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "성균관대", interviewType: "서류기반" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const body = await res.text();
    expect(body).toContain("event: chunk");
    expect(body).toContain("event: done");
  });

  it("500 (Claude 호출 전 내부 오류: API 키 없음)", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue(buildSupabaseForSuccess() as never);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "성균관대", interviewType: "MMI" }),
      }),
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error?.code).toBe("INTERNAL_ERROR");
  });
});
