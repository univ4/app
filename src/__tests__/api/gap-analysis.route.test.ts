/**
 * POST /api/student-record/gap-analysis — P1-4 세특 Gap 분석 SSE
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/student-record/gap-analysis/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRole: jest.fn(),
  resolveRecordStudentId: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  getStudentRole,
  resolveRecordStudentId,
} from "@/lib/student-record/recordStudentContext";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockGetStudentRole = getStudentRole as jest.MockedFunction<typeof getStudentRole>;
const mockResolveRecordStudentId = resolveRecordStudentId as jest.MockedFunction<
  typeof resolveRecordStudentId
>;

describe("POST /api/student-record/gap-analysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStudentRole.mockResolvedValue("viewer");
    mockResolveRecordStudentId.mockImplementation((uid: string) => uid);
  });

  it("비로그인 시 401", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost/api/student-record/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUniv: "서강대" }),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("targetUniv 누락 시 422", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);

    const res = await POST(
      new NextRequest("http://localhost/api/student-record/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remainingWeeks: 12 }),
      }),
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });
});
