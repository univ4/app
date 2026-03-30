/**
 * POST /api/jeongsi-gun — P2-10 정시 군별 전략
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/jeongsi-gun/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/chat/ragChat", () => {
  const actual = jest.requireActual("@/lib/chat/ragChat") as Record<string, unknown>;
  return {
    ...actual,
    embedQuery: jest.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.04)),
  };
});

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildJeongsiGunSupabase(opts: {
  admissionRows?: unknown[];
  scoringRows?: unknown[];
  susiRows?: unknown[];
  gpaRows?: unknown[];
  latestMock?: Record<string, unknown> | null;
}) {
  const {
    admissionRows = [],
    scoringRows = [],
    susiRows = [],
    gpaRows = [],
    latestMock = null,
  } = opts;

  let academicFromCount = 0;

  return {
    from(table: string) {
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
    rpc(name: string) {
      if (name === "try_consume_chat_quota") {
        return Promise.resolve({ data: { ok: true }, error: null });
      }
      if (name === "match_guideline_chunks") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

const ENGLISH_TABLE = {
  "1": 100,
  "2": 95,
  "3": 90,
  "4": 85,
  "5": 80,
  "6": 75,
  "7": 70,
  "8": 65,
  "9": 60,
};

describe("POST /api/jeongsi-gun", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await POST(
      new NextRequest("http://localhost/api/jeongsi-gun", {
        method: "POST",
        body: JSON.stringify({ gaUniv: "", naUniv: "", daUniv: "" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("정상 요청 시 strategy·ragSummary 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue(
      buildJeongsiGunSupabase({
        admissionRows: [
          {
            id: 2,
            univ_name: "서강대",
            dept_name: "자연계열",
            admission_type: "정시",
            year: 2026,
            cutoff_score: 999,
            med_shift_coeff: null,
          },
        ],
        scoringRows: [
          {
            university_name: "서강대",
            major_group: "자연계열",
            korean_ratio: 0.25,
            math_ratio: 0.35,
            english_ratio: 0.15,
            science_ratio: 0.25,
            science_2_bonus: 0,
            english_conversion_table: ENGLISH_TABLE,
          },
        ],
        susiRows: [],
        gpaRows: [],
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

    const res = await POST(
      new NextRequest("http://localhost/api/jeongsi-gun", {
        method: "POST",
        body: JSON.stringify({ gaUniv: "서강대", naUniv: "", daUniv: "" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.strategy.riskLevel).toBeDefined();
    expect(body.data.strategy.cards.ga).toMatchObject({
      university: "서강대",
      signal: "challenge",
    });
    expect(typeof body.data.ragSummary).toBe("string");
  });
});
