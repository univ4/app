/**
 * GET /api/trend-analysis — P2-9
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/trend-analysis/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildSupabase(rows: unknown[], err: { message: string } | null = null) {
  return {
    from(table: string) {
      if (table !== "admission_records") throw new Error(`unexpected table ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: rows, error: err }),
              })),
            })),
          })),
        })),
      };
    },
  };
}

describe("GET /api/trend-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(
      new NextRequest(
        "http://localhost/api/trend-analysis?univName=가&deptName=나&admissionType=정시",
      ),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("필수 쿼리가 없으면 422", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue({} as never);
    const res = await GET(new NextRequest("http://localhost/api/trend-analysis"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("인증 후 연도별 행이 있으면 records·trend 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue(
      buildSupabase([
        { year: 2024, cutoff_score: 100, competition_ratio: 3 },
        { year: 2025, cutoff_score: 97, competition_ratio: 3.1 },
      ]) as never,
    );

    const res = await GET(
      new NextRequest(
        "http://localhost/api/trend-analysis?univName=서강대&deptName=자연계열&admissionType=정시",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.records).toHaveLength(2);
    expect(body.data.trend.trend).toBe("down");
    expect(body.data.trend.analysis).toContain("하락");
  });
});
