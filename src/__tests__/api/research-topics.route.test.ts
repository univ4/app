/**
 * POST /api/research-topics — P1-8 탐구 주제 추천 SSE
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/research-topics/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRole: jest.fn(),
  resolveRecordStudentId: jest.fn(),
}));

jest.mock("@/lib/chat/ragChat", () => {
  const actual = jest.requireActual<typeof import("@/lib/chat/ragChat")>(
    "@/lib/chat/ragChat",
  );
  return {
    ...actual,
    embedQuery: jest.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.01)),
  };
});

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/chat/ragChat";
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
const mockEmbedQuery = embedQuery as jest.MockedFunction<typeof embedQuery>;

function buildSupabaseMock() {
  const orderMock = jest.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        chunk_text: "[세특] 3학년 1학기 · 물리학Ⅱ\n\n탐구: 간섭 실험",
        metadata: { section: "세특" },
      },
    ],
    error: null,
  });
  const eqMock = jest.fn().mockReturnValue({ order: orderMock });
  const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
  const fromMock = jest.fn().mockReturnValue({ select: selectMock });

  const rpcMock = jest.fn().mockImplementation((name: string) => {
    if (name === "try_consume_chat_quota") {
      return Promise.resolve({ data: { ok: true }, error: null });
    }
    if (name === "match_guideline_chunks") {
      return Promise.resolve({
        data: [
          {
            id: 1,
            chunk_text: "학생부종합: 학업·인성·진로 역량을 종합적으로 평가",
            metadata: { univ_name: "서강대", year: 2027 },
            similarity: 0.88,
          },
        ],
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });

  return { rpc: rpcMock, from: fromMock };
}

function anthropicSseChunk(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const payload = JSON.stringify({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text },
  });
  const body = `event: content_block_delta\ndata: ${payload}\n\n`;
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(body));
      controller.close();
    },
  });
}

describe("POST /api/research-topics", () => {
  const origFetch = global.fetch;
  const origKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStudentRole.mockResolvedValue("viewer");
    mockResolveRecordStudentId.mockImplementation((uid: string) => uid);
    process.env.ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: anthropicSseChunk(
        "## 탐구 주제 추천\n\n### 1. [스트림검증]\n- 연계 교과: 수학\n- 난이도: 하\n- 소요시간: 1주\n- 탐구 방향: x\n- 목표 대학 연계점: y",
      ),
    }) as never;
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env.ANTHROPIC_API_KEY = origKey;
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대" }),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("targetUniv 누락 시 422", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDept: "공대" }),
      }),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("정상 요청 시 SSE 스트리밍으로 응답한다", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10" } as never);
    mockCreateClient.mockResolvedValue(buildSupabaseMock() as never);

    const res = await POST(
      new NextRequest("http://localhost/api/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대", targetDept: "전자", subject: "물리학Ⅱ" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(mockEmbedQuery).toHaveBeenCalled();

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader!.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
    }
    expect(buf).toContain("event: chunk");
    expect(buf).toContain("스트림검증");
    expect(buf).toContain("event: done");
    expect(buf).toContain('"finish_reason":"stop"');
  });
});
