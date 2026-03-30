import { NextRequest } from "next/server";

import { POST } from "@/app/api/personal-statement/feedback/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildSupabaseForSseNoChunks() {
  const statementChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10",
        student_id: "user-1",
        university: "성균관대",
        question_number: 1,
        question_text: "지원 동기",
        draft_text: "초안",
        max_length: 1500,
      },
      error: null,
    }),
  };
  const chunksChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    from: jest.fn((table: string) => {
      if (table === "personal_statements") return statementChain;
      if (table === "student_record_chunks") return chunksChain;
      throw new Error(`unexpected table ${table}`);
    }),
    rpc: jest.fn().mockResolvedValue({ data: { ok: true, used: 1 }, error: null }),
  };
}

describe("POST /api/personal-statement/feedback coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CHAT_DAILY_LIMIT = "50";
  });

  it("401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/personal-statement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10",
          targetUniv: "서강대",
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("422 (statementId 누락)", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/personal-statement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대" }),
      }),
    );
    expect(res.status).toBe(422);
  });

  it("200 (정상 SSE 스트림 시작)", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue(buildSupabaseForSseNoChunks() as never);

    const res = await POST(
      new NextRequest("http://localhost/api/personal-statement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10",
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
