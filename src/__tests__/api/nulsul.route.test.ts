/**
 * GET /api/nulsul — P1-3 논술전형 목록
 */
import { NextRequest } from "next/server";

import { GET } from "@/app/api/nulsul/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function buildNulsulSupabase(rows: unknown[]) {
  return {
    from(table: string) {
      if (table !== "admission_records") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: rows, error: null }),
              })),
            })),
          })),
        })),
      };
    },
  };
}

describe("GET /api/nulsul", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/nulsul");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("인증 후 논술전형 목록·meta 반환", async () => {
    mockGetAuthUser.mockResolvedValue({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never);
    const sample = [
      {
        id: 1,
        univ_name: "서강대",
        dept_name: "논술A",
        admission_type: "논술전형",
        year: 2026,
        competition_ratio: 4.2,
      },
    ];
    mockCreateClient.mockResolvedValue(buildNulsulSupabase(sample) as never);

    const req = new NextRequest("http://localhost/api/nulsul?admissionYear=2026");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].univ_name).toBe("서강대");
    expect(body.data.meta.admission_year).toBe(2026);
    expect(body.data.meta.row_count).toBe(1);
  });
});
