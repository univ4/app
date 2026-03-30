/**
 * POST /api/nsu-strategy — N수생 전략 (Track 1 calcNsuStrategy)
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/nsu-strategy/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("POST /api/nsu-strategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401 + UNAUTHORIZED", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/nsu-strategy", {
      method: "POST",
      body: JSON.stringify({
        nsuYear: 1,
        targetType: "both",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("정상 요청 시 strategy 반환", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    const req = new NextRequest("http://localhost/api/nsu-strategy", {
      method: "POST",
      body: JSON.stringify({
        nsuYear: 1,
        prevScore: 400,
        suneungScore: 415,
        gpa: 2.4,
        targetType: "jeongsi",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.strategy).toBeDefined();
    expect(body.data.strategy.recommendedStrategy).toContain("상승");
    expect(typeof body.data.strategy.jeongsiAdvantage).toBe("boolean");
  });
});
