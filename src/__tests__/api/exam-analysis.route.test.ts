/**
 * GET/POST /api/exam-analysis — P2-4 기출 분석
 */
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/exam-analysis/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/chat/ragChat", () => ({
  embedQuery: jest.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.01)),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/chat/ragChat";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockEmbedQuery = embedQuery as jest.MockedFunction<typeof embedQuery>;

describe("GET /api/exam-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(
      new NextRequest("http://localhost/api/exam-analysis"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("정상 요청 시 items·meta (total 0)", async () => {
    mockGetAuthUser.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    } as never);
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      })),
    } as never);

    const res = await GET(
      new NextRequest("http://localhost/api/exam-analysis"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.items).toEqual([]);
    expect(body.data.meta).toEqual({ total: 0, univCount: 0 });
  });
});

describe("POST /api/exam-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await POST(
      new NextRequest("http://localhost/api/exam-analysis", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("JSON이 아니면 400", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
    mockCreateClient.mockResolvedValue({} as never);
    const res = await POST(
      new NextRequest("http://localhost/api/exam-analysis", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("query 비어 있으면 422", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
    mockCreateClient.mockResolvedValue({} as never);
    const res = await POST(
      new NextRequest("http://localhost/api/exam-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "", examType: "논술" }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("청크 0건이면 matches 빈 배열 (임베딩 호출 없음)", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          count: 0,
          error: null,
        }),
      })),
    } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/exam-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "테스트 질문", examType: "논술" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.matches).toEqual([]);
    expect(mockEmbedQuery).not.toHaveBeenCalled();
  });

  it("청크 있을 때 RPC·임베딩 경로", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
    const selectMock = jest
      .fn()
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({
        data: [{ univ_name: "연세대", year: 2026 }],
        error: null,
      });

    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({ select: selectMock })),
      rpc: jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            chunk_text: "본문",
            metadata: { source_file: "a.md" },
            similarity: 0.88,
            univ_name: "연세대",
            year: 2026,
            exam_type: "논술",
            dept_name: null,
          },
        ],
        error: null,
      }),
    } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/exam-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "AI 윤리", examType: "논술" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mockEmbedQuery).toHaveBeenCalled();
    expect(body.data.matches).toHaveLength(1);
    expect(body.data.matches[0].chunkText).toBe("본문");
  });
});
