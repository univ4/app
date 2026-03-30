/**
 * POST /api/scores/parse-image — P2-11 NEIS 성적표 이미지 파싱
 */
import { POST } from "@/app/api/scores/parse-image/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

function mockAuthedClient(chain: Record<string, unknown>) {
  mockCreateClient.mockResolvedValue({
    ...chain,
  } as never);
  mockGetAuthUser.mockResolvedValue({ id: "user-1" } as never);
}

function mockUnauthedClient() {
  mockCreateClient.mockResolvedValue({} as never);
  mockGetAuthUser.mockResolvedValue(null);
}

describe("/api/scores/parse-image", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("multipart: 비로그인 시 401 + UNAUTHORIZED", async () => {
    mockUnauthedClient();
    const fd = new FormData();
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("multipart: 파일 없음 시 422 + VALIDATION_ERROR", async () => {
    mockAuthedClient({ from: jest.fn() });
    const fd = new FormData();
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("multipart: PNG가 아니면 422", async () => {
    mockAuthedClient({ from: jest.fn() });
    const file = new File(["x"], "x.gif", { type: "image/gif" });
    const fd = new FormData();
    fd.append("file", file);
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("multipart: 10MB 초과 시 422", async () => {
    mockAuthedClient({ from: jest.fn() });
    const file = new File([new ArrayBuffer(11 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    const fd = new FormData();
    fd.append("file", file);
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("multipart: ANTHROPIC_API_KEY 없으면 500", async () => {
    mockAuthedClient({ from: jest.fn() });
    const pngSig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([pngSig], "t.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error?.code).toBe("INTERNAL_ERROR");
  });

  it("multipart dry_run: Vision 응답 JSON이면 parsed·inserted 0", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAuthedClient({ from: jest.fn() });
    const visionJson = JSON.stringify({
      grade: 2,
      semester: 1,
      subjects: [
        {
          subjectName: "국어",
          creditUnit: 4,
          rawScore: 90,
          classAvg: 70,
          stdDev: 10,
          studentCount: 100,
          grade: 2,
          achievementLevel: null,
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          content: [{ type: "text", text: visionJson }],
        }),
    });
    const pngSig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([pngSig], "t.png", { type: "image/png" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("dry_run", "1");
    const req = new NextRequest("http://localhost/api/scores/parse-image", {
      method: "POST",
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.inserted).toBe(0);
    expect(body.data.parsed.neisSemester).toBe("2-1");
    expect(body.error).toBeNull();
  });

  it("JSON commit: 보통교과 1건 upsert 성공 시 200·inserted 1", async () => {
    mockAuthedClient({
      from: jest.fn(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      })),
    });
    const res = await POST(
      new NextRequest("http://localhost/api/scores/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: "2-1",
          subjects: [
            {
              subjectName: "국어",
              creditUnit: 4,
              rawScore: 90,
              classAvg: 70,
              stdDev: 10,
              studentCount: 100,
              grade: 2,
            },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.inserted).toBe(1);
    expect(body.error).toBeNull();
  });
});
