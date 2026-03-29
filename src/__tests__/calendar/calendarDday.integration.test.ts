import { calcDDay } from "@/lib/calculators/calcDDay";
import { ADMISSION_SCHEDULE_2027 } from "@/lib/constants/schedules";

/**
 * P0-5: ADMISSION_SCHEDULE_2027 상수와 calcDDay 결합이 매뉴얼 §13 예시와 맞는지 검증.
 */
describe("calendar schedule + calcDDay integration", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("수시 원서접수 시작: 2026-03-29 기준 D-162", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 29));
    const { dday, label } = calcDDay(ADMISSION_SCHEDULE_2027.susiApplicationStart);
    expect(dday).toBe(162);
    expect(label).toBe("D-162");
  });

  it("수능: 시험 당일 D-Day", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 12));
    const { dday, label } = calcDDay(ADMISSION_SCHEDULE_2027.suneung);
    expect(dday).toBe(0);
    expect(label).toBe("D-Day");
  });

  it("정시 원서접수 시작: 수능 이후에도 미래면 양수 dday·D- 라벨", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 20));
    const { dday, label } = calcDDay(ADMISSION_SCHEDULE_2027.jeongsiApplicationStart);
    expect(dday).toBeGreaterThan(0);
    expect(label).toBe(`D-${dday}`);
  });
});
