/**
 * GET /api/signals — docs/04_API_SPEC §2 (signals)
 */
import { GET } from "@/app/api/signals/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildSignalsSupabase(opts: {
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
  };
}

describe("GET /api/signals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/signals") as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("인증 후 정상 요청 시 신호등 목록·메타 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    mockCreateClient.mockResolvedValue(
      buildSignalsSupabase({
        admissionRows: [
          {
            id: 1,
            univ_name: "테스트대",
            dept_name: "공학",
            admission_type: "정시",
            year: 2026,
            cutoff_score: 900,
            med_shift_coeff: null,
          },
        ],
        scoringRows: [],
        susiRows: [],
        gpaRows: [],
        latestMock: null,
      }) as never,
    );

    const res = await GET(new Request("http://localhost/api/signals") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.meta).toMatchObject({
      admission_year: 2026,
      med_shift_enabled: false,
      has_mock_exam: false,
      has_school_gpa: false,
    });
  });

  it("medShift=1 이면 meta.med_shift_enabled 가 true", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" } as never);
    mockCreateClient.mockResolvedValue(
      buildSignalsSupabase({
        admissionRows: [],
        latestMock: null,
      }) as never,
    );

    const res = await GET(
      new Request("http://localhost/api/signals?medShift=1") as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.meta.med_shift_enabled).toBe(true);
  });
});
