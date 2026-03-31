/**
 * /api/scores — PRD P0-1 성적 API, docs/04_API_SPEC 기준
 */
import { GET, POST } from "@/app/api/scores/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function mockAuthedClient(chain: Record<string, unknown>) {
  mockCreateClient.mockResolvedValue({
    ...chain,
  } as never);
  mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
}

function mockUnauthedClient() {
  mockCreateClient.mockResolvedValue({} as never);
  mockGetAuthUser.mockResolvedValue(null);
}

describe("/api/scores", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET — AC: 인증된 사용자만 목록 조회", () => {
    it("비로그인 시 401 + UNAUTHORIZED", async () => {
      mockUnauthedClient();
      const res = await GET(new Request("http://localhost/api/scores"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("로그인 시 목록·페이지네이션 반환 (type 미지정)", async () => {
      const listResult = { data: [{ id: 1 }], count: 1, error: null };
      const from = jest.fn((table: string) => {
        if (table === "students") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn().mockResolvedValue(listResult),
              })),
            })),
          })),
        };
      });
      mockAuthedClient({ from });
      const res = await GET(new Request("http://localhost/api/scores"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.items).toHaveLength(1);
      expect(body.data.canManageAcademicRecords).toBe(true);
      expect(body.data.pagination.total).toBe(1);
      expect(body.error).toBeNull();
    });

    it("엣지: type=MOCK_EXAM 필터 시 eq 체인 후 동일 응답 형식", async () => {
      const listResult = { data: [], count: 0, error: null };
      const eqMock = jest.fn().mockResolvedValue(listResult);
      const from = jest.fn((table: string) => {
        if (table === "students") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { role: "viewer" }, error: null }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn().mockReturnValue({
                  eq: eqMock,
                }),
              })),
            })),
          })),
        };
      });
      mockAuthedClient({ from });
      const res = await GET(
        new Request("http://localhost/api/scores?type=MOCK_EXAM"),
      );
      expect(res.status).toBe(200);
      expect(eqMock).toHaveBeenCalledWith("record_type", "MOCK_EXAM");
      const body = await res.json();
      expect(body.data.canManageAcademicRecords).toBe(false);
    });

    it("GET: DB 조회 에러 시 500 INTERNAL_ERROR", async () => {
      const from = jest.fn((table: string) => {
        if (table === "students") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn().mockResolvedValue({
                  data: null,
                  count: null,
                  error: { message: "db select failed" },
                }),
              })),
            })),
          })),
        };
      });
      mockAuthedClient({ from });
      const res = await GET(new Request("http://localhost/api/scores"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("db select failed");
    });

    it("GET: 학생 역할 조회 실패 시 500 INTERNAL_ERROR", async () => {
      const from = jest.fn((table: string) => {
        if (table === "students") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "role failed" } }),
              })),
            })),
          };
        }
        return {};
      });
      mockAuthedClient({ from });
      const res = await GET(new Request("http://localhost/api/scores"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("role failed");
    });
  });

  describe("POST — AC: 검증 후 저장·201", () => {
    it("POST: 비로그인 시 401 (GET과 동일 인증 분기)", async () => {
      mockUnauthedClient();
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record_type: "MOCK_EXAM" }),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("잘못된 payload 시 422 VALIDATION_ERROR", async () => {
      mockAuthedClient({ from: jest.fn() });
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record_type: "MOCK_EXAM" }),
        }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("happy path: MOCK_EXAM 유효 입력 시 insert 후 201", async () => {
      const inserted = { id: 99, student_id: "user-1" };
      const single = jest.fn().mockResolvedValue({ data: inserted, error: null });
      const select = jest.fn(() => ({ single }));
      const insert = jest.fn(() => ({ select }));
      mockAuthedClient({
        from: jest.fn(() => ({ insert })),
      });
      const payload = {
        record_type: "MOCK_EXAM",
        exam_date: "2026-06-04",
        korean_grade: 1,
        math_grade: 1,
        english_grade: 2,
        sci1_subject: "물리학Ⅱ",
        sci1_standard_score: 68,
        sci1_percentile: 97,
        sci2_subject: "화학Ⅱ",
        sci2_standard_score: 65,
        sci2_percentile: 94,
      };
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.id).toBe(99);
      expect(insert).toHaveBeenCalled();
    });

    it("엣지: SCHOOL_GPA achievement_level 빈 문자열 → null 저장 분기", async () => {
      const single = jest.fn().mockResolvedValue({
        data: { id: 2 },
        error: null,
      });
      mockAuthedClient({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
        })),
      });
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_type: "SCHOOL_GPA",
            semester: "3-1",
            subject_category: "general",
            subject_name: "수학Ⅰ",
            total_score: 95,
            raw_score: 92,
            avg_score: 68.4,
            stddev_score: 15.2,
            student_count: 187,
            credit_unit: 4,
            class_rank: 12,
            rank_total: 187,
            school_grade: 2,
            achievement_level: "",
          }),
        }),
      );
      expect(res.status).toBe(201);
    });

    it("POST: insert DB 에러 시 500 INTERNAL_ERROR", async () => {
      const single = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "insert constraint violation" },
      });
      mockAuthedClient({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
        })),
      });
      const payload = {
        record_type: "MOCK_EXAM",
        exam_date: "2026-06-04",
        korean_grade: 1,
        math_grade: 1,
        english_grade: 2,
        sci1_subject: "물리학Ⅱ",
        sci1_standard_score: 68,
        sci1_percentile: 97,
        sci2_subject: "화학Ⅱ",
        sci2_standard_score: 65,
        sci2_percentile: 94,
      };
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error?.code).toBe("INTERNAL_ERROR");
      expect(body.error?.message).toContain("insert constraint violation");
    });

    it("POST: MOCK_EXAM 필수 필드 누락 시 422 (라우트는 400 미사용)", async () => {
      mockAuthedClient({ from: jest.fn() });
      const res = await POST(
        new Request("http://localhost/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_type: "MOCK_EXAM",
            exam_date: "2026-06-04",
            korean_grade: 1,
            math_grade: 1,
            english_grade: 2,
          }),
        }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});
