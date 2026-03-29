export interface CalcDDayResult {
  /** Calendar-day delta: target − today. Positive = target in the future. */
  dday: number;
  /** Korean-style label: `D-162`, `D+3`, or `D-Day`. */
  label: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function parseTargetDate(targetDate: string): { y: number; m: number; d: number } {
  const m = targetDate.match(ISO_DATE);
  if (!m) {
    throw new Error("ValidationError: targetDate must be YYYY-MM-DD.");
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > daysInMonth(y, mo)) {
    throw new Error("ValidationError: targetDate must be a valid calendar date.");
  }
  return { y, m: mo, d };
}

function calendarPartsFromLocalDate(base: Date): { y: number; m: number; d: number } {
  if (Number.isNaN(base.getTime())) {
    throw new Error("ValidationError: internal base date is invalid.");
  }
  return {
    y: base.getFullYear(),
    m: base.getMonth(),
    d: base.getDate(),
  };
}

function utcMidnightStamp(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d);
}

/**
 * 오늘(로컬 달력 기준) 대비 목표일까지의 D-Day와 표시 라벨.
 * `targetDate`는 `YYYY-MM-DD` 만 허용한다.
 */
export function calcDDay(targetDate: string): CalcDDayResult {
  const target = parseTargetDate(targetDate);
  const base = calendarPartsFromLocalDate(new Date());
  const dday = Math.round(
    (utcMidnightStamp(target.y, target.m, target.d) - utcMidnightStamp(base.y, base.m, base.d)) /
      86_400_000,
  );

  let label: string;
  if (dday === 0) {
    label = "D-Day";
  } else if (dday > 0) {
    label = `D-${dday}`;
  } else {
    label = `D+${Math.abs(dday)}`;
  }

  return { dday, label };
}
