/**
 * GET /api/scores/zscore — PRD P1-2 Z점수·고교 수준 참고
 */
import { GET } from "@/app/api/scores/zscore/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function mockZscoreClient(rows: unknown[], err: { message: string } | null = null) {
  mockCreateClient.mockResolvedValue({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: rows, error: err }),
          })),
        })),
      })),
    })),
  } as never);
  mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
}

describe("GET /api/scores/zscore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("비로그인 시 401 UNAUTHORIZED", async () => {
    mockCreateClient.mockResolvedValue({} as never);
    mockGetAuthUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("로그인 시 내신 행 기준 subjects·schoolLevel 반환", async () => {
    mockZscoreClient([
      {
        id: 1,
        semester: "3-1",
        subject_name: "수학Ⅰ",
        subject_category: "general",
        raw_score: 92,
        avg_score: 68.4,
        stddev_score: 15.2,
        student_count: 120,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.subjects).toHaveLength(1);
    expect(body.data.subjects[0].zScore).toBe(1.55);
    expect(body.data.subjects[0].bandLabel).toBe("상위권");
    expect(body.data.schoolLevel.avgZScore).toBe(1.55);
    expect(body.data.schoolLevel.subjectZScores[0].subjectName).toContain("수학Ⅰ");
    expect(body.data.schoolLevel.disclaimer).toContain("학생부종합");
  });

  it("DB 오류 시 500 INTERNAL_ERROR", async () => {
    mockZscoreClient([], { message: "select failed" });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error?.code).toBe("INTERNAL_ERROR");
    expect(body.error?.message).toContain("select failed");
  });

  it("내신 행이 없으면 빈 subjects·schoolLevel 판별 불가", async () => {
    mockZscoreClient([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subjects).toEqual([]);
    expect(body.data.schoolLevel.levelLabel).toBe("판별 불가");
    expect(body.data.schoolLevel.subjectZScores).toEqual([]);
  });

  it("조회 data가 null이어도 빈 배열로 처리해 200", async () => {
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    } as never);
    mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subjects).toEqual([]);
  });

  it("학기·과목명이 비어 있으면 schoolLevel.subjectZScores 라벨에 기본값", async () => {
    mockZscoreClient([
      {
        id: 3,
        semester: null,
        subject_name: "   ",
        subject_category: "general",
        raw_score: 70,
        avg_score: 70,
        stddev_score: 10,
        student_count: 20,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.schoolLevel.subjectZScores[0].subjectName).toBe("? · 과목");
  });

  it("원점수·평균·표준편차·수강자수 중 하나라도 없으면 해당 행은 zScore null·omitReason", async () => {
    mockZscoreClient([
      {
        id: 10,
        semester: "2-1",
        subject_name: "미입력 평균",
        subject_category: "general",
        raw_score: 80,
        avg_score: null,
        stddev_score: 10,
        student_count: 30,
      },
      {
        id: 11,
        semester: "2-2",
        subject_name: "미입력 수강자수",
        subject_category: "general",
        raw_score: 80,
        avg_score: 70,
        stddev_score: 10,
        student_count: null,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.subjects).toHaveLength(2);
    expect(body.data.subjects[0].zScore).toBeNull();
    expect(body.data.subjects[0].omitReason).toContain("원점수");
    expect(body.data.subjects[1].zScore).toBeNull();
    expect(body.data.subjects[1].omitReason).toContain("수강자수");
    expect(body.data.schoolLevel.subjectZScores).toEqual([]);
  });
});
