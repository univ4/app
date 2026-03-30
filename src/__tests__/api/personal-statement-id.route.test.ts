/**
 * PUT /api/personal-statement/[id] — P1-6
 */
import { NextRequest } from "next/server";

import { PUT } from "@/app/api/personal-statement/[id]/route";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
  getAuthUser: jest.fn(),
}));

import { createClient, getAuthUser } from "@/lib/supabase/server";

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";
const ROW_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("PUT /api/personal-statement/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("인증 후 수정 성공", async () => {
    mockGetAuthUser.mockResolvedValue({ id: USER_ID } as never);
    const item = {
      id: ROW_ID,
      student_id: USER_ID,
      university: "성균관대",
      question_number: 1,
      question_text: "문항",
      draft_text: "수정됨",
      max_length: 1500,
      created_at: "2026-03-30T00:00:00.000Z",
      updated_at: "2026-03-30T01:00:00.000Z",
    };
    mockCreateClient.mockResolvedValue({
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: item, error: null }),
              })),
            })),
          })),
        })),
      })),
    } as never);

    const req = new NextRequest(`http://localhost/api/personal-statement/${ROW_ID}`, {
      method: "PUT",
      body: JSON.stringify({ draft_text: "수정됨" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: ROW_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data?.item?.draft_text).toBe("수정됨");
    expect(body.error).toBeNull();
  });
});
