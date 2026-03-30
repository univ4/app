/**
 * GET /api/explore — P1-15 / P1-16
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/explore/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const STUDENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function buildExploreSupabase(opts: {
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
    gpaRows = [
      { subject_name: "국어", credit_unit: 1, school_grade: 2, achievement_level: null },
    ],
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

describe("GET /api/explore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/explore"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("인증 후 전체 조회 시 필터 적용 목록·meta 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: STUDENT_ID } as never);
    mockCreateClient.mockResolvedValue(
      buildExploreSupabase({
        admissionRows: [
          {
            id: 1,
            univ_name: "테스트대",
            dept_name: "공학",
            admission_type: "학생부교과",
            year: 2026,
            cutoff_score: 4.0,
            med_shift_coeff: null,
          },
          {
            id: 2,
            univ_name: "테스트대",
            dept_name: "인문",
            admission_type: "학생부교과",
            year: 2026,
            cutoff_score: 1.0,
            med_shift_coeff: null,
          },
        ],
        susiRows: [
          {
            university_name: "테스트대",
            admission_type: "학생부교과",
            include_subjects: ["국어"],
            career_choice_conversion: {},
            suneung_minimum: null,
            interview_required: false,
          },
        ],
      }) as never,
    );

    const res = await GET(new NextRequest("http://localhost/api/explore"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.items.length).toBe(2);
    expect(body.data.meta.total).toBe(2);
    expect(typeof body.data.meta.duration_ms).toBe("number");
    expect(body.data.meta.duration_ms).toBeLessThan(3000);
  });

  it("admissionType=학생부종합 필터 시 교과 행 제외", async () => {
    mockGetAuthUser.mockResolvedValue({ id: STUDENT_ID } as never);
    mockCreateClient.mockResolvedValue(
      buildExploreSupabase({
        admissionRows: [
          {
            id: 1,
            univ_name: "테스트대",
            dept_name: "공학",
            admission_type: "학생부교과",
            year: 2026,
            cutoff_score: 4.0,
            med_shift_coeff: null,
          },
          {
            id: 2,
            univ_name: "다른대",
            dept_name: "학종",
            admission_type: "학생부종합",
            year: 2026,
            cutoff_score: 4.0,
            med_shift_coeff: null,
          },
        ],
        susiRows: [
          {
            university_name: "테스트대",
            admission_type: "학생부교과",
            include_subjects: ["국어"],
            career_choice_conversion: {},
            suneung_minimum: null,
            interview_required: false,
          },
          {
            university_name: "다른대",
            admission_type: "학생부종합",
            include_subjects: ["국어"],
            career_choice_conversion: {},
            suneung_minimum: null,
            interview_required: false,
          },
        ],
      }) as never,
    );

    const res = await GET(
      new NextRequest("http://localhost/api/explore?admissionType=학생부종합"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.every((r: { admission_type: string }) => r.admission_type === "학생부종합")).toBe(
      true,
    );
    expect(body.data.meta.total).toBe(1);
    expect(body.data.meta.duration_ms).toBeLessThan(3000);
  });

  it("signal=safe 필터 시 안정 행만 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: STUDENT_ID } as never);
    mockCreateClient.mockResolvedValue(
      buildExploreSupabase({
        admissionRows: [
          {
            id: 1,
            univ_name: "테스트대",
            dept_name: "공학",
            admission_type: "학생부교과",
            year: 2026,
            cutoff_score: 4.0,
            med_shift_coeff: null,
          },
          {
            id: 2,
            univ_name: "테스트대",
            dept_name: "인문",
            admission_type: "학생부교과",
            year: 2026,
            cutoff_score: 1.0,
            med_shift_coeff: null,
          },
        ],
        susiRows: [
          {
            university_name: "테스트대",
            admission_type: "학생부교과",
            include_subjects: ["국어"],
            career_choice_conversion: {},
            suneung_minimum: null,
            interview_required: false,
          },
        ],
      }) as never,
    );

    const res = await GET(new NextRequest("http://localhost/api/explore?signal=safe"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.every((r: { signal: string }) => r.signal === "safe")).toBe(true);
    expect(body.data.meta.total).toBe(1);
    expect(body.data.meta.duration_ms).toBeGreaterThanOrEqual(0);
    expect(body.data.meta.duration_ms).toBeLessThan(3000);
  });
});
