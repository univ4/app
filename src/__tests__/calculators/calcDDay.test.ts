import { calcDDay } from "@/lib/calculators/calcDDay";

describe("calcDDay", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("미래 일정: 오늘 대비 남은 일수·D- 라벨", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 29));
    const { dday, label } = calcDDay("2026-09-07");
    expect(dday).toBe(162);
    expect(label).toBe("D-162");
  });

  it("당일: dday 0, D-Day", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 12, 15, 0, 0));
    const { dday, label } = calcDDay("2026-11-12");
    expect(dday).toBe(0);
    expect(label).toBe("D-Day");
  });

  it("과거 일정: 음수 dday·D+ 라벨", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 4));
    const { dday, label } = calcDDay("2026-03-01");
    expect(dday).toBe(-3);
    expect(label).toBe("D+3");
  });

  it("경계: 연말→연초 하루 차이", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 11, 31));
    const { dday, label } = calcDDay("2027-01-01");
    expect(dday).toBe(1);
    expect(label).toBe("D-1");
  });

  it("07_TEST_SPEC DD-01: 기준 2026-03-27 → 164일", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 27));
    expect(calcDDay("2026-09-07").dday).toBe(164);
    expect(calcDDay("2026-09-07").label).toBe("D-164");
  });

  it("잘못된 형식: 전체 형식 위반", () => {
    expect(() => calcDDay("not-a-date")).toThrow(/ValidationError/);
  });

  it("잘못된 형식: 월·일 범위 위반", () => {
    expect(() => calcDDay("2026-13-01")).toThrow(/ValidationError/);
    expect(() => calcDDay("2026-02-30")).toThrow(/ValidationError/);
  });

  it("잘못된 형식: 선행 0 없는 일자", () => {
    expect(() => calcDDay("2026-9-07")).toThrow(/ValidationError/);
  });
});
