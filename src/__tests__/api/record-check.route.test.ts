/**
 * GET /api/record-check — 생기부 공백 탐지 (P1-14)
 */
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { GET } from "@/app/api/record-check/route";

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRecordRequestContext: jest.fn(),
}));

jest.mock("@/lib/record-check/recordGapFromDb", () => ({
  loadRecordGapAnalysisForStudent: jest.fn(),
}));

import { loadRecordGapAnalysisForStudent } from "@/lib/record-check/recordGapFromDb";
import { getStudentRecordRequestContext } from "@/lib/student-record/recordStudentContext";

const mockGetCtx = getStudentRecordRequestContext as jest.MockedFunction<
  typeof getStudentRecordRequestContext
>;
const mockLoad = loadRecordGapAnalysisForStudent as jest.MockedFunction<
  typeof loadRecordGapAnalysisForStudent
>;

describe("GET /api/record-check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비인증 시 401", async () => {
    mockGetCtx.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 },
      ),
    });

    const res = await GET(new NextRequest("http://localhost/api/record-check"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("조회 성공 시 items·overallScore·criticalCount·targetUnivType 반환", async () => {
    mockGetCtx.mockResolvedValue({
      ok: true,
      supabase: {} as never,
      user: { id: "user-1" } as never,
      role: "viewer",
      recordStudentId: "user-1",
    });

    mockLoad.mockResolvedValue({
      ok: true,
      targetUnivType: "science",
      data: {
        items: [
          {
            section: "수상경력",
            status: "critical",
            currentLength: 0,
            minLength: 1,
            message: "치명적 공백: 수상경력 없음",
          },
        ],
        overallScore: 15,
        criticalCount: 1,
      },
    });

    const res = await GET(new NextRequest("http://localhost/api/record-check"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.overallScore).toBe(15);
    expect(body.data.criticalCount).toBe(1);
    expect(body.data.targetUnivType).toBe("science");
    expect(mockLoad).toHaveBeenCalledWith({}, "user-1");
  });
});
