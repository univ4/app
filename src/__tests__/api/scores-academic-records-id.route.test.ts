import { DELETE, PUT } from "@/app/api/scores/academic-records/[id]/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function authedWithFrom(from: (table: string) => unknown) {
  mockCreateClient.mockResolvedValue({ from } as never);
  mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
}

describe("/api/scores/academic-records/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("PUT: 비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await PUT(
      new Request("http://localhost/api/scores/academic-records/1", {
        method: "PUT",
        body: JSON.stringify({}),
      }) as never,
      { params: Promise.resolve({ id: "1" }) } as never,
    );
    expect(res.status).toBe(401);
  });

  it("PUT: Admin이 내신 행을 수정하면 200", async () => {
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
      if (table === "academic_records") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 10, student_id: "user-1", record_type: "SCHOOL_GPA" },
                error: null,
              }),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 10, subject_name: "수학I" },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }
      return {};
    });
    authedWithFrom(from);

    const res = await PUT(
      new Request("http://localhost/api/scores/academic-records/10", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: "3-1",
          subject_category: "general",
          subject_name: "수학I",
          credit_unit: 4,
          total_score: 95,
          raw_score: 92,
          avg_score: 68.4,
          stddev_score: 15.2,
          student_count: 187,
          class_rank: 12,
          rank_total: 187,
          school_grade: 2,
          achievement_level: "",
        }),
      }) as never,
      { params: Promise.resolve({ id: "10" }) } as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.id).toBe(10);
  });

  it("DELETE: Admin이 내신 행을 삭제하면 200", async () => {
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
      if (table === "academic_records") {
        return {
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  select: jest.fn(() => ({
                    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 10 }, error: null }),
                  })),
                })),
              })),
            })),
          })),
        };
      }
      return {};
    });
    authedWithFrom(from);

    const res = await DELETE(
      new Request("http://localhost/api/scores/academic-records/10", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "10" }) } as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.deleted_id).toBe(10);
  });
});
