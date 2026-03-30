/**
 * POST /api/mock-interview/feedback — P1-9 모의 면접 피드백 SSE
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/mock-interview/feedback/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("POST /api/mock-interview/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "질문",
          answer: "답",
          targetUniv: "서강대",
        }),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("question 누락 시 422", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/mock-interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: "답만",
          targetUniv: "서강대",
        }),
      }),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });
});
