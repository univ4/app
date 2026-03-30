/**
 * POST /api/science-combo — P3-4 과탐 조합 시뮬레이터
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/science-combo/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildSupabase(opts: { scoringRows?: unknown[] }) {
  const { scoringRows = [] } = opts;
  return {
    from(table: string) {
      if (table === "university_scoring_rules") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: scoringRows, error: null }),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const validBody = { science1: "물리학Ⅰ", science2: "화학Ⅱ" };

describe("POST /api/science-combo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/science-combo", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("정상 요청 시 result 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue(
      buildSupabase({
        scoringRows: [
          {
            university_name: "서강대학교",
            math_ratio: 0.35,
            science_2_bonus: 0.03,
            admission_year: 2027,
          },
        ],
      }) as never,
    );

    const req = new NextRequest("http://localhost/api/science-combo", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data?.result).toBeDefined();
    expect(body.data.result.recommendation).toBeTruthy();
    expect(Array.isArray(body.data.result.advantageUnivs)).toBe(true);
    expect(Array.isArray(body.data.result.disadvantageUnivs)).toBe(true);
  });
});
