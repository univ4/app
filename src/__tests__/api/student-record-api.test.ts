/**
 * /api/student-record/* — docs/04_API_SPEC §5c
 */
import { NextResponse } from "next/server";

import { GET as getActivities, POST as postActivities } from "@/app/api/student-record/activities/route";
import { GET as getAwards, POST as postAwards } from "@/app/api/student-record/awards/route";
import { GET as getAttendance, PUT as putAttendance } from "@/app/api/student-record/attendance/route";
import { PUT as putActivity, DELETE as deleteActivity } from "@/app/api/student-record/activities/[id]/route";
import { PUT as putAward, DELETE as deleteAward } from "@/app/api/student-record/awards/[id]/route";
import { DELETE as deleteCertificate } from "@/app/api/student-record/certificates/[id]/route";
import { DELETE as deleteReading } from "@/app/api/student-record/reading/[id]/route";
import { DELETE as deleteSchoolViolence } from "@/app/api/student-record/school-violence/[id]/route";
import {
  PUT as putSubjectNote,
  DELETE as deleteSubjectNote,
} from "@/app/api/student-record/subject-notes/[id]/route";
import { DELETE as deleteVolunteer } from "@/app/api/student-record/volunteer/[id]/route";
import { GET as getBehavior, PUT as putBehavior } from "@/app/api/student-record/behavior/route";
import { GET as getCertificates } from "@/app/api/student-record/certificates/route";
import { GET as getReading } from "@/app/api/student-record/reading/route";
import { GET as getSchoolViolence } from "@/app/api/student-record/school-violence/route";
import {
  GET as getSubjectNotes,
  POST as postSubjectNotes,
} from "@/app/api/student-record/subject-notes/route";
import { GET as getVolunteer } from "@/app/api/student-record/volunteer/route";

jest.mock("@/lib/student-record/recordStudentContext", () => ({
  getStudentRecordRequestContext: jest.fn(),
  requireAdmin: jest.fn(),
}));

jest.mock("@/lib/student-record/recalculateVolunteerCumulative", () => ({
  recalculateVolunteerCumulative: jest.fn().mockResolvedValue({ ok: true }),
}));

import {
  getStudentRecordRequestContext,
  requireAdmin,
} from "@/lib/student-record/recordStudentContext";

const mockGetCtx = getStudentRecordRequestContext as jest.MockedFunction<
  typeof getStudentRecordRequestContext
>;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;

/** 유효 UUID — [id] 라우트 파라미터 검증용 (RFC 4122) */
const SR_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function idCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function unauthorizedCtx() {
  mockGetCtx.mockResolvedValue({
    ok: false,
    response: NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    ),
  });
}

function okCtx(chain: Record<string, unknown>) {
  mockGetCtx.mockResolvedValue({
    ok: true,
    supabase: chain as never,
    user: { id: "user-1" } as never,
    role: "admin",
    recordStudentId: "user-1",
  });
}

describe("/api/student-record/subject-notes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getSubjectNotes(new Request("http://localhost/api/student-record/subject-notes"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "n1", grade: 1, semester: 1, subject_name: "수학", note: "a" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: items, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await getSubjectNotes(new Request("http://localhost/api/student-record/subject-notes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
    expect(body.error).toBeNull();
  });

  it("POST: Admin 거부 시 403", async () => {
    okCtx({ from: jest.fn() });
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "x" } },
        { status: 403 },
      ),
    });
    const res = await postSubjectNotes(
      new Request("http://localhost/api/student-record/subject-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 1,
          semester: 1,
          subject_name: "수학",
          note: "내용",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST: 유효 입력 시 201", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "new", grade: 1, semester: 1, subject_name: "수학", note: "내용" },
      error: null,
    });
    okCtx({
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single })),
        })),
      })),
    });
    const res = await postSubjectNotes(
      new Request("http://localhost/api/student-record/subject-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 1,
          semester: 1,
          subject_name: "수학",
          note: "내용",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.item.id).toBe("new");
  });
});

describe("/api/student-record/activities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getActivities(new Request("http://localhost/api/student-record/activities"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "a1", grade: 1, activity_type: "자율활동", content: "x" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: items, error: null }),
            })),
          })),
        })),
      })),
    });
    const res = await getActivities(new Request("http://localhost/api/student-record/activities"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });

  it("POST: Admin 거부 시 403", async () => {
    okCtx({ from: jest.fn() });
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "x" } },
        { status: 403 },
      ),
    });
    const res = await postActivities(
      new Request("http://localhost/api/student-record/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 2,
          activity_type: "동아리활동",
          content: "동아리 활동 내용",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST: 유효 입력 시 201", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "act-new", grade: 2, activity_type: "동아리활동", content: "동아리 활동 내용" },
      error: null,
    });
    okCtx({
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single })),
        })),
      })),
    });
    const res = await postActivities(
      new Request("http://localhost/api/student-record/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 2,
          activity_type: "동아리활동",
          content: "동아리 활동 내용",
        }),
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe("/api/student-record/awards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getAwards(new Request("http://localhost/api/student-record/awards"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "w1", award_name: "수상" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({ data: items, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await getAwards(new Request("http://localhost/api/student-record/awards"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });

  it("POST: Admin 거부 시 403", async () => {
    okCtx({ from: jest.fn() });
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "x" } },
        { status: 403 },
      ),
    });
    const res = await postAwards(
      new Request("http://localhost/api/student-record/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 1,
          semester: 1,
          award_name: "교내상",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST: 유효 입력 시 201", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "aw-new", award_name: "교내상" },
      error: null,
    });
    okCtx({
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single })),
        })),
      })),
    });
    const res = await postAwards(
      new Request("http://localhost/api/student-record/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: 1,
          semester: 1,
          award_name: "교내상",
        }),
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe("/api/student-record/behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getBehavior(new Request("http://localhost/api/student-record/behavior"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "b1", grade: 1, content: "의견" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: items, error: null }),
          })),
        })),
      })),
    });
    const res = await getBehavior(new Request("http://localhost/api/student-record/behavior"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });

  it("PUT: Admin 거부 시 403", async () => {
    okCtx({ from: jest.fn() });
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "x" } },
        { status: 403 },
      ),
    });
    const res = await putBehavior(
      new Request("http://localhost/api/student-record/behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: 3, content: "종합의견" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("PUT: 신규 삽입 시 201", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const insertSingle = jest.fn().mockResolvedValue({
      data: { id: "bh-new", grade: 3, content: "종합의견" },
      error: null,
    });
    okCtx({
      from: jest.fn((table: string) => {
        if (table === "student_behavior") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle,
                })),
              })),
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({ single: insertSingle })),
            })),
          };
        }
        return {};
      }),
    });
    const res = await putBehavior(
      new Request("http://localhost/api/student-record/behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: 3, content: "종합의견" }),
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe("/api/student-record/attendance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getAttendance(new Request("http://localhost/api/student-record/attendance"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "at1", grade: 1, school_days: 190, absence_illness: 0 }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: items, error: null }),
          })),
        })),
      })),
    });
    const res = await getAttendance(new Request("http://localhost/api/student-record/attendance"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
    expect(body.error).toBeNull();
  });

  it("PUT: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await putAttendance(
      new Request("http://localhost/api/student-record/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: 1, school_days: 190 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 신규 학년 출결 upsert 시 201", async () => {
    const item = {
      id: "at-new",
      student_id: "user-1",
      grade: 2,
      school_days: 190,
      absence_illness: 0,
      absence_unauthorized: 0,
      absence_other: 0,
      late_illness: 0,
      late_unauthorized: 0,
      late_other: 0,
      early_leave_illness: 0,
      early_leave_unauthorized: 0,
      early_leave_other: 0,
      result_illness: 0,
      result_unauthorized: 0,
      result_other: 0,
      note: null,
    };
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: item, error: null }),
          })),
        })),
      })),
    });
    const res = await putAttendance(
      new Request("http://localhost/api/student-record/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: 2, school_days: 190 }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.item.grade).toBe(2);
    expect(body.error).toBeNull();
  });
});

describe("/api/student-record/volunteer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getVolunteer(new Request("http://localhost/api/student-record/volunteer"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "v1", grade: 1, hours: 10, cumulative_hours: 10 }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: items, error: null }),
            })),
          })),
        })),
      })),
    });
    const res = await getVolunteer(new Request("http://localhost/api/student-record/volunteer"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });
});

describe("/api/student-record/reading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getReading(new Request("http://localhost/api/student-record/reading"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "r1", grade: 2, subject_area: "국어", content: "독서" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: items, error: null }),
            })),
          })),
        })),
      })),
    });
    const res = await getReading(new Request("http://localhost/api/student-record/reading"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });
});

describe("/api/student-record/certificates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getCertificates(new Request("http://localhost/api/student-record/certificates"));
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "c1", cert_type: "자격증", cert_name: "정보처리기능사" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: items, error: null }),
          })),
        })),
      })),
    });
    const res = await getCertificates(new Request("http://localhost/api/student-record/certificates"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });
});

describe("/api/student-record/school-violence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await getSchoolViolence(
      new Request("http://localhost/api/student-record/school-violence"),
    );
    expect(res.status).toBe(401);
  });

  it("GET: 목록 반환", async () => {
    const items = [{ id: "sv1", grade: 2, decision_date: "2025-01-01", action_detail: "조치" }];
    okCtx({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: items, error: null }),
            })),
          })),
        })),
      })),
    });
    const res = await getSchoolViolence(
      new Request("http://localhost/api/student-record/school-violence"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toEqual(items);
  });
});

describe("/api/student-record/subject-notes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  const tableHandlers = () => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: SR_ID,
                student_id: "user-1",
                grade: 1,
                semester: 1,
                subject_name: "수학",
                note: "수정됨",
              },
              error: null,
            }),
          })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
          })),
        })),
      })),
    })),
  });

  it("PUT: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await putSubjectNote(
      new Request("http://localhost/api/student-record/subject-notes/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "수정됨" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 유효 패치 시 200", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await putSubjectNote(
      new Request("http://localhost/api/student-record/subject-notes/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "수정됨" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.item.note).toBe("수정됨");
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteSubjectNote(
      new Request("http://localhost/api/student-record/subject-notes/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await deleteSubjectNote(
      new Request("http://localhost/api/student-record/subject-notes/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/activities/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  const tableHandlers = () => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: SR_ID,
                student_id: "user-1",
                grade: 2,
                activity_type: "동아리활동",
                hours: null,
                hope_field: null,
                content: "수정 본문",
              },
              error: null,
            }),
          })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
          })),
        })),
      })),
    })),
  });

  it("PUT: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await putActivity(
      new Request("http://localhost/api/student-record/activities/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "수정 본문" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 유효 패치 시 200", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await putActivity(
      new Request("http://localhost/api/student-record/activities/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "수정 본문" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.item.content).toBe("수정 본문");
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteActivity(
      new Request("http://localhost/api/student-record/activities/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await deleteActivity(
      new Request("http://localhost/api/student-record/activities/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/awards/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  const tableHandlers = () => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: SR_ID,
                student_id: "user-1",
                grade: 1,
                semester: 1,
                award_name: "수정상",
                rank: null,
                award_date: null,
                organization: null,
                participants: null,
                created_at: "2026-01-01T00:00:00Z",
              },
              error: null,
            }),
          })),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
          })),
        })),
      })),
    })),
  });

  it("PUT: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await putAward(
      new Request("http://localhost/api/student-record/awards/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ award_name: "수정상" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("PUT: 유효 패치 시 200", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await putAward(
      new Request("http://localhost/api/student-record/awards/x", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ award_name: "수정상" }),
      }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.item.award_name).toBe("수정상");
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteAward(
      new Request("http://localhost/api/student-record/awards/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({ from: jest.fn(() => tableHandlers()) });
    const res = await deleteAward(
      new Request("http://localhost/api/student-record/awards/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/volunteer/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteVolunteer(
      new Request("http://localhost/api/student-record/volunteer/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({
      from: jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await deleteVolunteer(
      new Request("http://localhost/api/student-record/volunteer/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/reading/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteReading(
      new Request("http://localhost/api/student-record/reading/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({
      from: jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await deleteReading(
      new Request("http://localhost/api/student-record/reading/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/certificates/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteCertificate(
      new Request("http://localhost/api/student-record/certificates/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({
      from: jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await deleteCertificate(
      new Request("http://localhost/api/student-record/certificates/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});

describe("/api/student-record/school-violence/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true });
  });

  it("DELETE: 비인증 시 401", async () => {
    unauthorizedCtx();
    const res = await deleteSchoolViolence(
      new Request("http://localhost/api/student-record/school-violence/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(401);
  });

  it("DELETE: 성공 시 deleted_id 반환", async () => {
    okCtx({
      from: jest.fn(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: SR_ID }, error: null }),
              })),
            })),
          })),
        })),
      })),
    });
    const res = await deleteSchoolViolence(
      new Request("http://localhost/api/student-record/school-violence/x", { method: "DELETE" }),
      idCtx(SR_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted_id).toBe(SR_ID);
  });
});
