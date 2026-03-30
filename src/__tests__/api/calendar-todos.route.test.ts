/**
 * GET /api/calendar/todos — P1-12 역산 TO-DO, docs/04_API_SPEC §5b
 */
import { GET } from "@/app/api/calendar/todos/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";
const EVENT_ID = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("GET /api/calendar/todos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("비로그인 시 401 + UNAUTHORIZED", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("로그인 시 RPC 후 일정 기반 todos 배열을 반환한다", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));

    const items = [
      {
        id: EVENT_ID,
        student_id: USER_ID,
        title: "수시 원서접수 시작",
        event_date: "2026-09-07",
        event_type: "원서접수",
        university: null,
        alert_days: [30, 7, 1],
        note: null,
        created_at: "2026-03-30T12:00:00.000Z",
      },
    ];
    const order2 = jest.fn().mockResolvedValue({ data: items, error: null });
    const order1 = jest.fn(() => ({ order: order2 }));
    const eq = jest.fn(() => ({ order: order1 }));
    const select = jest.fn(() => ({ eq }));
    mockCreateClient.mockResolvedValue({
      rpc: jest.fn().mockResolvedValue({ error: null }),
      from: jest.fn(() => ({ select })),
    } as never);
    mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data.todos)).toBe(true);
    expect(body.data.todos.length).toBeGreaterThanOrEqual(1);
    expect(body.data.todos[0]).toMatchObject({
      timing: expect.any(String),
      task: expect.any(String),
      category: expect.any(String),
      event_id: EVENT_ID,
    });
  });
});
