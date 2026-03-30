/**
 * GET /api/integrated-strategy — P2-6
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/integrated-strategy/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildIntegratedSupabase(opts: {
  portfolioCards?: unknown;
  admissionRows?: unknown[];
  scoringRows?: unknown[];
  susiRows?: unknown[];
  gpaRows?: unknown[];
  latestMock?: Record<string, unknown> | null;
}) {
  const {
    portfolioCards = [],
    admissionRows = [],
    scoringRows = [],
    susiRows = [],
    gpaRows = [],
    latestMock = null,
  } = opts;

  let academicFromCount = 0;

  return {
    from(table: string) {
      if (table === "simulator_portfolios") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { cards: portfolioCards },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "admission_records") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: admissionRows, error: null }),
          })),
        };
      }
      if (table === "university_scoring_rules") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: scoringRows, error: null }),
          })),
        };
      }
      if (table === "susi_gpa_rules") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn().mockResolvedValue({ data: susiRows, error: null }),
            })),
          })),
        };
      }
      if (table === "academic_records") {
        academicFromCount += 1;
        if (academicFromCount === 1) {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: gpaRows, error: null }),
              })),
            })),
          };
        }
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

describe("GET /api/integrated-strategy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/integrated-strategy"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("로그인 시 포트폴리오·신호 기반 통합 결과 반환", async () => {
    const uid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    mockGetAuthUser.mockResolvedValue({ id: uid } as never);
    mockCreateClient.mockResolvedValue(
      buildIntegratedSupabase({
        portfolioCards: [
          {
            university: "서강대",
            department: "공학",
            admissionType: "학생부교과",
            signal: "safe",
            hasSuneungMinimum: false,
          },
        ],
        admissionRows: [
          {
            id: 1,
            univ_name: "한양대",
            dept_name: "공학",
            admission_type: "정시",
            year: 2026,
            cutoff_score: 900,
            med_shift_coeff: null,
          },
        ],
        scoringRows: [
          {
            university_name: "한양대",
            major_group: "공학",
            korean_ratio: 0.2,
            math_ratio: 0.35,
            english_ratio: 0.15,
            science_ratio: 0.3,
            science_2_bonus: 0,
            english_conversion_table: { "1": 100, "2": 95 },
          },
        ],
        susiRows: [],
        gpaRows: [],
        latestMock: {
          exam_date: "2026-01-01",
          korean_standard_score: 130,
          math_standard_score: 140,
          english_grade: 3,
          sci1_standard_score: 55,
          sci2_standard_score: 55,
          subject_name: "물리학I",
        },
      }) as never,
    );

    const res = await GET(new NextRequest("http://localhost/api/integrated-strategy"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.summary).toBeTruthy();
    expect(Array.isArray(body.data.napchiRisks)).toBe(true);
    expect(body.data.napchiRisks.length).toBe(1);
    expect(body.data.allFailScenario).toBeDefined();
    expect(["balanced", "aggressive", "too_safe"]).toContain(body.data.overallRisk);
  });
});
