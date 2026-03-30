/**
 * GET/POST /api/grade-simulator — P2-5 성적 예측 시뮬레이터
 */
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/grade-simulator/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function mockUnauthed() {
  mockCreateClient.mockResolvedValue({} as never);
  mockGetAuthUser.mockResolvedValue(null);
}

describe("/api/grade-simulator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("비로그인 시 401", async () => {
      mockUnauthed();
      const res = await GET(new NextRequest("http://localhost/api/grade-simulator"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("로그인 시 내신 행·대학 컷 목록 반환", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => {
          if (table === "academic_records") {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    order: jest.fn(() => ({
                      order: jest.fn().mockResolvedValue({
                        data: [
                          {
                            id: 1,
                            subject_name: "국어",
                            school_grade: 3,
                            credit_unit: 2,
                            semester: "3-1",
                            exam_date: "2026-03-01",
                          },
                        ],
                        error: null,
                      }),
                    })),
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
                    not: jest.fn().mockResolvedValue({
                      data: [
                        { univ_name: "서강대", cutoff_score: 2.5 },
                        { univ_name: "서강대", cutoff_score: 2.8 },
                      ],
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      } as never);

      const res = await GET(new NextRequest("http://localhost/api/grade-simulator"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.data.records).toHaveLength(1);
      expect(body.data.universities).toEqual([{ univName: "서강대", cutoffGrade: 2.5 }]);
      expect(body.data.admissionYear).toBe(2027);
    });

    it("잘못된 admissionYear면 422", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({} as never);
      const res = await GET(
        new NextRequest("http://localhost/api/grade-simulator?admissionYear=1999"),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST", () => {
    it("비로그인 시 401", async () => {
      mockUnauthed();
      const res = await POST(
        new NextRequest("http://localhost/api/grade-simulator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentSubjects: [
              {
                subjectName: "국어",
                currentGrade: 3,
                creditUnit: 2,
                semester: "3-1",
              },
            ],
            targetGrades: [{ subjectName: "국어", targetGrade: 2 }],
          }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("유효한 본문이면 시뮬레이션 결과 반환", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({} as never);

      const res = await POST(
        new NextRequest("http://localhost/api/grade-simulator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentSubjects: [
              {
                subjectName: "국어",
                currentGrade: 3,
                creditUnit: 2,
                semester: "3-1",
              },
            ],
            targetGrades: [{ subjectName: "국어", targetGrade: 2 }],
            cutoffGrade: 3,
          }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.error).toBeNull();
      expect(body.data.result.currentAvgGrade).toBe(3);
      expect(body.data.result.simulatedAvgGrade).toBe(2);
      expect(body.data.result.signalChange?.before).toBeDefined();
    });

    it("빈 currentSubjects면 422", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({} as never);

      const res = await POST(
        new NextRequest("http://localhost/api/grade-simulator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentSubjects: [], targetGrades: [] }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });
});
