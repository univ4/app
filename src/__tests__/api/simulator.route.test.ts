/**
 * GET/POST /api/simulator — P1-7 원서 배분 시뮬레이터
 */
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/simulator/route";

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

describe("/api/simulator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("비로그인 시 401", async () => {
      mockUnauthed();
      const res = await GET(new NextRequest("http://localhost/api/simulator"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("로그인 시 portfolio 행 반환", async () => {
      const row = {
        id: "p1",
        student_id: "user-1",
        cards: [],
        created_at: "2026-01-01T00:00:00Z",
      };
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
            })),
          })),
        })),
      } as never);

      const res = await GET(new NextRequest("http://localhost/api/simulator"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.portfolio).toEqual(row);
      expect(body.error).toBeNull();
    });
  });

  describe("POST", () => {
    it("비로그인 시 401", async () => {
      mockUnauthed();
      const res = await POST(
        new NextRequest("http://localhost/api/simulator", {
          method: "POST",
          body: JSON.stringify({ cards: [] }),
        }),
      );
      expect(res.status).toBe(401);
    });

    it("유효한 cards 저장 후 portfolio 반환", async () => {
      const saved = {
        id: "p1",
        student_id: "user-1",
        cards: [
          {
            university: "서강대",
            department: "자연",
            admissionType: "학생부교과",
            signal: "moderate",
            hasSuneungMinimum: false,
          },
        ],
        created_at: "2026-01-01T00:00:00Z",
      };
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({
        from: jest.fn(() => ({
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: saved, error: null }),
            })),
          })),
        })),
      } as never);

      const res = await POST(
        new NextRequest("http://localhost/api/simulator", {
          method: "POST",
          body: JSON.stringify({ cards: saved.cards }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.portfolio.cards).toHaveLength(1);
      expect(body.error).toBeNull();
    });

    it("잘못된 본문 → 422", async () => {
      mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
      mockCreateClient.mockResolvedValue({} as never);
      const res = await POST(
        new NextRequest("http://localhost/api/simulator", {
          method: "POST",
          body: JSON.stringify({ cards: "nope" }),
        }),
      );
      expect(res.status).toBe(422);
    });
  });
});
