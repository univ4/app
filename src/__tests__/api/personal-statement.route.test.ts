/**
 * GET/POST /api/personal-statement — P1-6 자소서 코치
 */
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/personal-statement/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";
const ROW_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("/api/personal-statement", () => {
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
        university: "서강대",
        question_number: 1,
        question_text: "지원 동기",
        draft_text: "안녕",
        max_length: 1500,
        created_at: "2026-03-30T00:00:00.000Z",
        updated_at: "2026-03-30T00:00:00.000Z",
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
      expect(body.data?.items[0]?.university).toBe("서강대");
      expect(body.error).toBeNull();
    });
  });

  describe("POST", () => {
    it("비인증 시 401", async () => {
      mockCreateClient.mockResolvedValue({} as never);
      mockGetAuthUser.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/personal-statement", {
        method: "POST",
        body: JSON.stringify({
          university: "한양대",
          question_number: 2,
          question_text: "q",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("유효한 본문으로 저장 후 201", async () => {
      mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
      const item = {
        id: ROW_ID,
        student_id: USER_ID,
        university: "한양대",
        question_number: 2,
        question_text: "문항",
        draft_text: "초안",
        max_length: 1500,
        created_at: "2026-03-30T00:00:00.000Z",
        updated_at: "2026-03-30T00:00:00.000Z",
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

      const req = new NextRequest("http://localhost/api/personal-statement", {
        method: "POST",
        body: JSON.stringify({
          university: "한양대",
          question_number: 2,
          question_text: "문항",
          draft_text: "초안",
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
