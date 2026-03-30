/**
 * GET/POST /api/mock-interview — P1-9 면접 기록
 */
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/mock-interview/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";
const ROW_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("/api/mock-interview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("비인증 시 401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("인증 시 목록 반환", async () => {
      mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
      const item = {
        id: ROW_ID,
        student_id: USER_ID,
        target_univ: "서강대",
        interview_type: "서류기반",
        question: "Q1",
        answer: "A1",
        feedback: "F1",
        created_at: "2026-03-30T00:00:00.000Z",
      };
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: [item], error: null }),
            })),
          })),
        })),
      } as never);

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data?.items).toHaveLength(1);
      expect(body.data?.items[0]?.target_univ).toBe("서강대");
      expect(body.error).toBeNull();
    });
  });

  describe("POST", () => {
    it("비인증 시 401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/mock-interview", {
        method: "POST",
        body: JSON.stringify({
          targetUniv: "한양대",
          interviewType: "MMI",
          question: "q",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("question 누락 시 422", async () => {
      mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
      mockCreateClient.mockResolvedValue({} as never);

      const req = new NextRequest("http://localhost/api/mock-interview", {
        method: "POST",
        body: JSON.stringify({
          targetUniv: "한양대",
          interviewType: "MMI",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("유효한 본문으로 저장 후 201", async () => {
      mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
      const item = {
        id: ROW_ID,
        student_id: USER_ID,
        target_univ: "한양대",
        interview_type: "MMI",
        question: "면접 질문",
        answer: "답변",
        feedback: null,
        created_at: "2026-03-30T00:00:00.000Z",
      };
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: item, error: null }),
            })),
          })),
        })),
      } as never);

      const req = new NextRequest("http://localhost/api/mock-interview", {
        method: "POST",
        body: JSON.stringify({
          targetUniv: "한양대",
          interviewType: "MMI",
          question: "면접 질문",
          answer: "답변",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data?.item?.id).toBe(ROW_ID);
      expect(body.error).toBeNull();
    });
  });
});
