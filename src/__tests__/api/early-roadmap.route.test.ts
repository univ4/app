/**
 * POST /api/early-roadmap — P3-3 고1/고2 조기 설계 로드맵
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/early-roadmap/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("POST /api/early-roadmap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401 + UNAUTHORIZED", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/early-roadmap", {
      method: "POST",
      body: JSON.stringify({
        currentGrade: 1,
        currentSemester: 1,
        targetUnivType: "mid",
        targetDept: "science",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("정상 요청 시 phases·keyMilestones·summary 반환", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    const req = new NextRequest("http://localhost/api/early-roadmap", {
      method: "POST",
      body: JSON.stringify({
        currentGrade: 1,
        currentSemester: 2,
        targetUnivType: "mid",
        targetDept: "liberal",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.phases).toHaveLength(4);
    expect(body.data.phases[0].phase).toBe("고1 1학기");
    expect(body.data.keyMilestones.length).toBeGreaterThan(0);
    expect(typeof body.data.summary).toBe("string");
  });
});
