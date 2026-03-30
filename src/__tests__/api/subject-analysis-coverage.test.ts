import { NextRequest } from "next/server";

import { GET } from "@/app/api/subject-analysis/route";
import { POST } from "@/app/api/subject-analysis/profile/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("subject-analysis coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/subject-analysis", () => {
    it("401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("200 (프로필 없음 -> 빈 결과)", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "subject_profiles") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            };
          }
          if (table === "students") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { target_universities: [] },
                    error: null,
                  }),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      } as never);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.profile).toBeNull();
      expect(body.data.eligibility.eligibleUniversityCount).toBe(0);
    });

    it("200 (프로필 있음 -> eligibility/advantage 계산)", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "subject_profiles") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: {
                        korean_subject: "언어와매체",
                        math_subject: "미적분",
                        science1: "물리학I",
                        science2: "지구과학I",
                        social1: null,
                        social2: null,
                        second_foreign: null,
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          if (table === "students") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { target_universities: ["성균관대"] },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "univ_subject_requirements") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: "r1",
                      univ_id: "u1",
                      dept_id: "d1",
                      year: 2027,
                      required_math: ["미적분", "기하"],
                      required_science: ["물리학I"],
                      preferred_subjects: null,
                      disqualified_subjects: [],
                      notes: null,
                      universities: { name: "성균관대" },
                      departments: { name: "소프트웨어학부" },
                    },
                  ],
                  error: null,
                }),
              })),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: jest.fn(() => ({
                in: jest.fn(() => ({
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      {
                        university_name: "성균관대",
                        math_ratio: 40,
                        science_2_bonus: 3,
                        admission_year: 2027,
                        major_group: "자연계열",
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      } as never);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.data.profile.math_subject).toBe("미적분");
      expect(body.data.eligibility.universitiesWithRequirementData).toBe(1);
    });
  });

  describe("POST /api/subject-analysis/profile", () => {
    it("401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);

      const res = await POST(
        new NextRequest("http://localhost/api/subject-analysis/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            korean_subject: "언어와매체",
            math_subject: "미적분",
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("201 (정상 저장)", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      const single = jest.fn().mockResolvedValue({
        data: {
          id: "profile-1",
          student_id: "user-1",
          year: 2027,
          updated_at: "2026-03-30T00:00:00.000Z",
        },
        error: null,
      });
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
        })),
      } as never);

      const res = await POST(
        new NextRequest("http://localhost/api/subject-analysis/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            korean_subject: "언어와매체",
            math_subject: "미적분",
            science1: "물리학I",
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student_id).toBe("user-1");
      expect(body.error).toBeNull();
    });

    it("422 (필수 필드 누락)", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

      const res = await POST(
        new NextRequest("http://localhost/api/subject-analysis/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            korean_subject: "언어와매체",
          }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });
});
