import {
  aggregateAdmissionTodosFromCalendarEvents,
  calcAdmissionTodos,
} from "@/lib/calculators/calcAdmissionTodos";

describe("calcAdmissionTodos", () => {
  it("원서접수 D-30 이전(dday>30)이면 전체 TO-DO를 반환한다", () => {
    const { todos } = calcAdmissionTodos({
      targetDate: "2026-09-07",
      eventType: "원서접수",
      dday: 35,
    });
    expect(todos).toHaveLength(5);
    expect(todos[0].timing).toBe("D-30");
    expect(todos[0].task).toContain("6장");
    expect(todos[4].timing).toBe("D-1");
  });

  it("원서접수 D-7이면 D-7 이하 마일스톤만 반환한다", () => {
    const { todos } = calcAdmissionTodos({
      targetDate: "2026-09-07",
      eventType: "원서접수",
      dday: 7,
    });
    expect(todos).toHaveLength(3);
    expect(todos.map((t) => t.timing)).toEqual(["D-7", "D-3", "D-1"]);
  });

  it("수능 D-1이면 D-1 TO-DO만 반환한다", () => {
    const { todos } = calcAdmissionTodos({
      targetDate: "2026-11-12",
      eventType: "수능",
      dday: 1,
    });
    expect(todos).toHaveLength(1);
    expect(todos[0].timing).toBe("D-1");
    expect(todos[0].task).toContain("수면");
  });

  it("이미 지난 일정(dday<0)이면 빈 배열을 반환한다", () => {
    const { todos } = calcAdmissionTodos({
      targetDate: "2025-01-01",
      eventType: "원서접수",
      dday: -1,
    });
    expect(todos).toEqual([]);
  });

  it("targetDate 형식이 잘못되면 ValidationError", () => {
    expect(() =>
      calcAdmissionTodos({
        targetDate: "09-07-2026",
        eventType: "원서접수",
        dday: 10,
      }),
    ).toThrow(/ValidationError/);
  });

  it("dday가 유한하지 않으면 ValidationError", () => {
    expect(() =>
      calcAdmissionTodos({
        targetDate: "2026-09-07",
        eventType: "원서접수",
        dday: Number.NaN,
      }),
    ).toThrow(/ValidationError/);
  });

  it("면접·기타 유형은 빈 배열", () => {
    expect(
      calcAdmissionTodos({
        targetDate: "2026-10-01",
        eventType: "면접",
        dday: 20,
      }).todos,
    ).toEqual([]);
  });
});

describe("aggregateAdmissionTodosFromCalendarEvents", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("일정별 TO-DO를 날짜 순으로 합친다", () => {
    const rows = aggregateAdmissionTodosFromCalendarEvents([
      {
        id: "b",
        title: "정시",
        event_date: "2027-01-12",
        event_type: "정시",
      },
      {
        id: "a",
        title: "수시 원서",
        event_date: "2026-09-07",
        event_type: "원서접수",
      },
    ]);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].event_date).toBe("2026-09-07");
    const jeongsiFirst = rows.findIndex((r) => r.event_date === "2027-01-12");
    const susiFirst = rows.findIndex((r) => r.event_date === "2026-09-07");
    expect(susiFirst).toBeLessThan(jeongsiFirst);
  });
});
