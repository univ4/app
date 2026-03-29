/**
 * /api/analysis/probability — docs/04_API_SPEC
 */
import { GET } from "@/app/api/analysis/probability/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe("/api/analysis/probability", () => {
  const originalEnv = process.env.MEDICAL_SHIFT_DISCOUNT_FACTOR;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MEDICAL_SHIFT_DISCOUNT_FACTOR = "0";
  });

  afterAll(() => {
    process.env.MEDICAL_SHIFT_DISCOUNT_FACTOR = originalEnv;
  });

  describe("AC: 인증·쿼리 검증", () => {
    it("비로그인 401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(401);
    });

    it("universities 누락 시 422", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(422);
    });

    it("admission_type=학생부교과 시 미지원 422", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=학생부교과",
        ) as never,
      );
      expect(res.status).toBe(422);
    });
  });

  describe("AC: 최신 모의고사·대학 규칙 기반 확률 산출", () => {
    it("모의고사 없으면 404", async () => {
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
                            Promise.resolve({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(404);
    });

    it("happy path: 환산점수·probability 필드 포함 배열 반환", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: "sci1:물리학Ⅱ|sci2:화학Ⅱ",
      };
      const rulesRow = {
        university_name: "서강대",
        major_group: "자연계열",
        admission_year: 2026,
        korean_ratio: 0.25,
        math_ratio: 0.35,
        english_ratio: 0.15,
        science_ratio: 0.25,
        science_2_bonus: 0.03,
        english_conversion_table: { "1": 100, "2": 96, "3": 90 },
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: rulesRow, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "converted_standard_scores") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      in: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: { converted_score: 900 },
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
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].university).toBe("서강대");
      expect(typeof body[0].converted_score).toBe("number");
      expect(["안정", "적정", "도전"]).toContain(body[0].probability);
    });

    it("latestErr: 최신 모의고사 조회 실패 시 500 INTERNAL_ERROR", async () => {
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
                              data: null,
                              error: { message: "latest query failed" },
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("latest query failed");
    });

    it("rulesErr: university_scoring_rules 조회 실패 시 500 INTERNAL_ERROR", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: null,
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: null,
                        error: { message: "rules query failed" },
                      }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("rules query failed");
    });

    it("getCutline70: converted_standard_scores Supabase error 시 500 반환", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: "sci1:물리학Ⅱ|sci2:화학Ⅱ",
      };
      const rulesRow = {
        university_name: "서강대",
        major_group: "자연계열",
        admission_year: 2026,
        korean_ratio: 0.25,
        math_ratio: 0.35,
        english_ratio: 0.15,
        science_ratio: 0.25,
        science_2_bonus: 0.03,
        english_conversion_table: { "1": 100, "2": 96, "3": 90 },
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: rulesRow, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "converted_standard_scores") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      in: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: null,
                              error: { message: "DB error" },
                            }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("DB error");
    });

    it("getCutline70 실패 시 cutline_70을 converted_score로 폴백", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: "sci1:물리학Ⅱ|sci2:화학Ⅱ",
      };
      const rulesRow = {
        university_name: "서강대",
        major_group: "자연계열",
        admission_year: 2026,
        korean_ratio: 0.25,
        math_ratio: 0.35,
        english_ratio: 0.15,
        science_ratio: 0.25,
        science_2_bonus: 0.03,
        english_conversion_table: { "1": 100, "2": 96, "3": 90 },
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: rulesRow, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "converted_standard_scores") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      in: () => ({
                        limit: () => ({
                          maybeSingle: () =>
                            Promise.resolve({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=서강대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body[0].cutline_70).toBe(body[0].converted_score);
    });

    it("universities 파싱 후 대학 0개면 빈 배열 반환", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: null,
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=%20%20&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it("university_scoring_rules 행이 없으면 404 NOT_FOUND", async () => {
      const mockRow = {
        korean_standard_score: 131,
        math_standard_score: 145,
        english_grade: 2,
        sci1_standard_score: 68,
        sci2_standard_score: 65,
        subject_name: null,
      };
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
                            Promise.resolve({ data: mockRow, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "university_scoring_rules") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as never);
      const res = await GET(
        new Request(
          "http://localhost/api/analysis/probability?universities=없는대&admission_type=정시",
        ) as never,
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error?.code).toBe("NOT_FOUND");
      expect(body.error?.message).toContain("university_scoring_rules not found");
    });

    it("필수 쿼리 파라미터(admission_type) 누락 시 422 (라우트는 400 미사용)", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue({ id: "u1" } as never);
      const res = await GET(
        new Request("http://localhost/api/analysis/probability?universities=서강대") as never,
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
