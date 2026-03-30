/**
 * GET /api/subject-analysis — P1-11 선택과목 분석
 */
import { GET } from "@/app/api/subject-analysis/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildSubjectAnalysisClient(opts: {
  profile: Record<string, unknown> | null;
  targetUniversities?: string[];
  requirements?: unknown[];
  scoringRules?: unknown[];
}) {
  const { profile, targetUniversities = [], requirements = [], scoringRules = [] } = opts;

  return {
    from(table: string) {
      if (table === "subject_profiles") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: profile, error: null }),
              })),
            })),
          })),
        };
      }
      if (table === "students") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: { target_universities: targetUniversities }, error: null }),
            })),
          })),
        };
      }
      if (table === "univ_subject_requirements") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: requirements, error: null }),
          })),
        };
      }
      if (table === "university_scoring_rules") {
        return {
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: scoringRules, error: null }),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("GET /api/subject-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401 UNAUTHORIZED", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("프로필 없을 때 profile null·안내 summary 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateClient.mockResolvedValue(
      buildSubjectAnalysisClient({
        profile: null,
        targetUniversities: [],
      }) as never,
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.profile).toBeNull();
    expect(body.data.eligibility.eligibleUniversityCount).toBe(0);
    expect(body.data.advantage.summary).toContain("선택과목 프로필");
    expect(body.error).toBeNull();
  });
});
