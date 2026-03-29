/**
 * /api/calendar, /api/calendar/[id] — P0-5 가족 입시 캘린더, docs/04_API_SPEC §5b
 */
import { DELETE, PUT } from "@/app/api/calendar/[id]/route";
import { GET, POST } from "@/app/api/calendar/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";
const EVENT_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

function mockUnauthedClient() {
  mockCreateClient.mockResolvedValue({} as never);
  mockGetAuthUser.mockResolvedValue(null);
}

function mockAuthedClient(chain: Record<string, unknown>) {
  mockCreateClient.mockResolvedValue({
    ...chain,
  } as never);
  mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
}

function studentsAdminChain() {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      })),
    })),
  };
}

function studentsViewerChain() {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: "viewer" },
          error: null,
        }),
      })),
    })),
  };
}

describe("/api/calendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("비로그인 시 401 + UNAUTHORIZED", async () => {
      mockUnauthedClient();
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("로그인 시 RPC 후 일정 목록 반환", async () => {
      const items = [
        {
          id: EVENT_ID,
          student_id: USER_ID,
          title: "수능",
          event_date: "2026-11-12",
          event_type: "수능",
          university: null,
          alert_days: [7, 3, 1, 0],
          note: null,
          created_at: "2026-03-30T12:00:00.000Z",
        },
      ];
      const order2 = jest.fn().mockResolvedValue({ data: items, error: null });
      const order1 = jest.fn(() => ({ order: order2 }));
      const eq = jest.fn(() => ({ order: order1 }));
      const select = jest.fn(() => ({ eq }));
      mockAuthedClient({
        rpc: jest.fn().mockResolvedValue({ error: null }),
        from: jest.fn(() => ({ select })),
      });
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].title).toBe("수능");
      expect(body.error).toBeNull();
    });
  });

  describe("POST", () => {
    const validBody = {
      title: "모의지원",
      event_date: "2026-12-01",
      event_type: "원서접수",
      university: "서강대",
      alert_days: [7, 1],
      note: "메모",
    };

    it("비로그인 시 401", async () => {
      mockUnauthedClient();
      const res = await POST(
        new Request("http://localhost/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("Viewer 권한 시 403 FORBIDDEN", async () => {
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsViewerChain();
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await POST(
        new Request("http://localhost/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("Admin 정상 요청 시 201 및 생성 일정 반환", async () => {
      const created = {
        id: EVENT_ID,
        student_id: USER_ID,
        title: validBody.title,
        event_date: validBody.event_date,
        event_type: validBody.event_type,
        university: validBody.university,
        alert_days: validBody.alert_days,
        note: validBody.note,
        created_at: "2026-03-30T12:00:00.000Z",
      };
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsAdminChain();
          if (table === "calendar_events") {
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: created, error: null }),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await POST(
        new Request("http://localhost/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.item.id).toBe(EVENT_ID);
      expect(body.error).toBeNull();
    });

    it("필수 필드 누락 시 422 VALIDATION_ERROR", async () => {
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsAdminChain();
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await POST(
        new Request("http://localhost/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "only title",
            event_date: "2026-12-01",
            event_type: "기타",
          }),
        }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    });
  });
});

describe("/api/calendar/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const params = Promise.resolve({ id: EVENT_ID });

  describe("PUT", () => {
    it("비로그인 시 401", async () => {
      mockUnauthedClient();
      const res = await PUT(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "변경" }),
        }),
        { params },
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("Viewer 권한 시 403", async () => {
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsViewerChain();
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await PUT(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "변경" }),
        }),
        { params },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("Admin 정상 요청 시 200 및 수정 일정 반환", async () => {
      const updated = {
        id: EVENT_ID,
        student_id: USER_ID,
        title: "변경된 제목",
        event_date: "2026-12-01",
        event_type: "기타",
        university: null,
        alert_days: [1],
        note: null,
        created_at: "2026-03-30T12:00:00.000Z",
      };
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsAdminChain();
          if (table === "calendar_events") {
            return {
              update: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                      maybeSingle: jest
                        .fn()
                        .mockResolvedValue({ data: updated, error: null }),
                    })),
                  })),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await PUT(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "변경된 제목" }),
        }),
        { params },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.item.title).toBe("변경된 제목");
      expect(body.error).toBeNull();
    });
  });

  describe("DELETE", () => {
    it("비로그인 시 401", async () => {
      mockUnauthedClient();
      const res = await DELETE(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "DELETE",
        }),
        { params },
      );
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("Viewer 권한 시 403", async () => {
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsViewerChain();
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await DELETE(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "DELETE",
        }),
        { params },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("Admin 정상 요청 시 200", async () => {
      mockAuthedClient({
        from: jest.fn((table: string) => {
          if (table === "students") return studentsAdminChain();
          if (table === "calendar_events") {
            return {
              delete: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    select: jest.fn(() => ({
                      maybeSingle: jest
                        .fn()
                        .mockResolvedValue({ data: { id: EVENT_ID }, error: null }),
                    })),
                  })),
                })),
              })),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      });
      const res = await DELETE(
        new Request("http://localhost/api/calendar/" + EVENT_ID, {
          method: "DELETE",
        }),
        { params },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.deleted_id).toBe(EVENT_ID);
      expect(body.error).toBeNull();
    });
  });
});
