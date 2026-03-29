/**
 * /api/analysis/minimum-check
 */
import { GET, POST } from "@/app/api/analysis/minimum-check/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("/api/analysis/minimum-check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AC: 인증·모의고사 필수", () => {
    it("비로그인 401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("모의고사 없으면 404", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () =>
                        Promise.resolve({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        })),
      } as never);
      const res = await GET();
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("AC: 규칙별 checkSuneungMinimum 결과 반환", () => {
    it("happy: 유효한 suneung_minimum 행마다 satisfied 등 필드 포함", async () => {
      const ruleRows = [
        {
          university_name: "테스트대",
          admission_type: "학생부교과",
          suneung_minimum: {
            condition: "3개합6",
            subjects: ["korean", "math", "sci1"],
            english_limit: 2,
            major_group: "자연계열",
          },
        },
      ];
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "academic_records") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: {
                                korean_grade: 1,
                                math_grade: 1,
                                english_grade: 2,
                                sci1_grade: 1,
                                sci2_grade: 2,
                              },
                              error: null,
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "susi_gpa_rules") {
            return {
              select: () => ({
                not: jest.fn().mockResolvedValue({ data: ruleRows, error: null }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results).toHaveLength(1);
      expect(body.data.results[0].university).toBe("테스트대");
      expect(body.data.results[0].satisfied).toBe(true);
      expect(body.data.results[0].best_combination.length).toBeGreaterThan(0);
      expect(typeof body.data.results[0].probability).toBe("number");
      expect(body.data.results[0].risk_level).toMatch(/^(safe|caution|danger)$/);
    });

    it("엣지: condition/subjects 비어 있으면 satisfied=false 고정 객체", async () => {
      const ruleRows = [
        {
          university_name: "빈규칙대",
          admission_type: "수시",
          suneung_minimum: {
            condition: "",
            subjects: [],
            major_group: "자연계열",
          },
        },
      ];
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "academic_records") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: {
                                korean_grade: 1,
                                math_grade: 1,
                                english_grade: 1,
                                sci1_grade: 1,
                                sci2_grade: 1,
                              },
                              error: null,
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "susi_gpa_rules") {
            return {
              select: () => ({
                not: jest.fn().mockResolvedValue({ data: ruleRows, error: null }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET();
      const body = await res.json();
      expect(body.data.results[0].satisfied).toBe(false);
      expect(body.data.results[0].best_combination).toEqual([]);
      expect(body.data.results[0].probability).toBeNull();
    });

    it("suneung_minimum 행이 없으면 results 빈 배열", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "academic_records") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: {
                                korean_grade: 1,
                                math_grade: 1,
                                english_grade: 2,
                                sci1_grade: 1,
                                sci2_grade: 1,
                              },
                              error: null,
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "susi_gpa_rules") {
            return {
              select: () => ({
                not: () => ({
                  then: (cb: (r: unknown) => unknown) =>
                    Promise.resolve({ data: [], error: null }).then(cb),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results).toEqual([]);
      expect(body.data.student_grades.korean).toBe(1);
    });

    it("엣지: 최신 모의고사 조회 DB 에러 시 500", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () =>
                        Promise.resolve({
                          data: null,
                          error: { message: "db fail" },
                        }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        })),
      } as never);
      const res = await GET();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
    });

    it("엣지: susi_gpa_rules 조회 에러 시 500", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "academic_records") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: {
                                korean_grade: 1,
                                math_grade: 1,
                                english_grade: 2,
                                sci1_grade: 1,
                                sci2_grade: 1,
                              },
                              error: null,
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "susi_gpa_rules") {
            return {
              select: () => ({
                not: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: "rules error" },
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET();
      expect(res.status).toBe(500);
    });

    it("POST: calcSuneungMinimumProbability 연동·성공 envelope", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      const req = new Request("http://localhost/api/analysis/minimum-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: [
            { subject: "korean", grade: 1 },
            { subject: "math", grade: 2 },
            { subject: "english", grade: 2 },
            { subject: "sci1", grade: 2 },
            { subject: "sci2", grade: 2 },
          ],
          requirement: {
            minGradeSum: 6,
            subjectCount: 3,
            hankoSaRequired: false,
            englishMaxGrade: 2,
          },
          sampleCount: 2000,
          seed: 1,
        }),
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.data.probability).toBeGreaterThanOrEqual(0);
      expect(body.data.probability).toBeLessThanOrEqual(1);
      expect(typeof body.data.expectedGradeSum).toBe("number");
      expect(body.data.riskLevel).toMatch(/^(safe|caution|danger)$/);
    });
  });
});
