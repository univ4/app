/**
 * POST /api/gachaejeom — P1-10
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/gachaejeom/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const ENGLISH_TABLE = { "1": 100, "2": 96, "3": 90, "4": 82, "5": 72 } as const;

function buildGachaejeomSupabase(opts: {
  scoringRows?: unknown[];
  admissionRows?: unknown[];
}) {
  const { scoringRows = [], admissionRows = [] } = opts;
  return {
    from(table: string) {
      if (table === "university_scoring_rules") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn().mockResolvedValue({ data: scoringRows, error: null }),
              })),
            })),
          })),
        };
      }
      if (table === "admission_records") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  not: jest.fn().mockResolvedValue({ data: admissionRows, error: null }),
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

const validBody = {
  korean: { rawScore: 63, subject: "언어와매체" },
  math: { rawScore: 68, subject: "미적분" },
  english: { grade: 2 },
  science1: { rawScore: 50, subjectName: "생명과학Ⅰ" },
  science2: { rawScore: 50, subjectName: "지구과학Ⅰ" },
};

describe("POST /api/gachaejeom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/gachaejeom", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("인증·DB 정상 시 추정점수·대학별 환산·신호등 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue(
      buildGachaejeomSupabase({
        scoringRows: [
          {
            university_name: "서강대",
            major_group: "자연계열",
            korean_ratio: 0.25,
            math_ratio: 0.35,
            english_ratio: 0.15,
            science_ratio: 0.25,
            science_2_bonus: 0.03,
            english_conversion_table: ENGLISH_TABLE,
          },
        ],
        admissionRows: [
          {
            id: 1,
            univ_name: "서강대",
            dept_name: "자연계열",
            cutoff_score: 700,
            med_shift_coeff: null,
          },
        ],
      }) as never,
    );

    const req = new NextRequest("http://localhost/api/gachaejeom", {
      method: "POST",
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.estimatedScores.korean.standardScore).toBe(100);
    expect(body.data.warning).toContain("가채점");
    expect(body.data.univResults).toHaveLength(1);
    expect(body.data.univResults[0].university_name).toBe("서강대");
    expect(body.data.univResults[0].signal).toMatch(/safe|moderate|challenge/u);
    expect(typeof body.data.univResults[0].converted_score).toBe("number");
  });
});
