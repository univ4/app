/**
 * POST /api/personal-statement/feedback — P1-6 SSE 피드백
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/personal-statement/feedback/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("POST /api/personal-statement/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
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
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("statementId 누락 시 422", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10" } as never);
    mockCreateClient.mockResolvedValue({} as never);
    const res = await POST(
      new NextRequest("http://localhost/api/personal-statement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대" }),
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });
});
