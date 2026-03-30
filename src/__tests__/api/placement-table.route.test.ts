/**
 * GET /api/placement-table — P2-12 정시 배치표
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/placement-table/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildPlacementSupabase(opts: {
  admissionRows?: unknown[];
  scoringRow?: Record<string, unknown> | null;
  latestMock?: Record<string, unknown> | null;
}) {
  const { admissionRows = [], scoringRow = null, latestMock = null } = opts;

  return {
    from(table: string) {
      if (table === "admission_records") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn().mockResolvedValue({ data: admissionRows, error: null }),
              })),
            })),
          })),
        };
      }
      if (table === "university_scoring_rules") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    maybeSingle: jest.fn().mockResolvedValue({ data: scoringRow, error: null }),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      if (table === "academic_records") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => ({
                      maybeSingle: jest
                        .fn()
                        .mockResolvedValue({ data: latestMock, error: null }),
                    })),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("GET /api/placement-table", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(
      new NextRequest("http://localhost/api/placement-table?myScore=400"),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("인증 후 정시 행으로 배치표·메타 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue(
      buildPlacementSupabase({
        admissionRows: [
          {
            univ_name: "테스트대",
            dept_name: "공학",
            admission_type: "정시",
            cutoff_score: 300,
            med_shift_coeff: null,
          },
        ],
        scoringRow: {
          university_name: "서강대",
          major_group: "자연계열",
          korean_ratio: 0.25,
          math_ratio: 0.35,
          english_ratio: 0.15,
          science_ratio: 0.25,
          science_2_bonus: 0,
          english_conversion_table: { "1": 100, "2": 95, "3": 90, "4": 85, "5": 80, "6": 75, "7": 70, "8": 65, "9": 60 },
        },
        latestMock: {
          korean_standard_score: 100,
          math_standard_score: 100,
          english_grade: 3,
          sci1_standard_score: 100,
          sci2_standard_score: 100,
          subject_name: "생명과학1",
        },
      }) as never,
    );

    const res = await GET(
      new NextRequest("http://localhost/api/placement-table?myScore=400&medShift=0&region=all"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.meta.my_score_used).toBe(400);
    expect(Array.isArray(body.data.safe)).toBe(true);
    expect(Array.isArray(body.data.moderate)).toBe(true);
    expect(Array.isArray(body.data.challenge)).toBe(true);
  });

  it("medShift=1 이면 meta.med_shift_enabled 가 true", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" } as never);
    mockCreateClient.mockResolvedValue(
      buildPlacementSupabase({
        admissionRows: [],
        scoringRow: null,
        latestMock: null,
      }) as never,
    );

    const res = await GET(
      new NextRequest("http://localhost/api/placement-table?myScore=350&medShift=1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.meta.med_shift_enabled).toBe(true);
  });
});
