/**
 * POST /api/mock-interview/questions — P1-9 모의 면접 질문 SSE
 */
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

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("POST /api/mock-interview/questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUniv: "서강대",
          interviewType: "서류기반",
        }),
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
      new NextRequest("http://localhost/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewType: "MMI" }),
      }),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });
});
