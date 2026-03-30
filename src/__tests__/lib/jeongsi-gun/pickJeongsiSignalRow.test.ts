import { pickJeongsiSignalForUniv } from "@/lib/jeongsi-gun/pickJeongsiSignalRow";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

function row(
  id: number,
  univ: string,
  signal: "safe" | "moderate" | "challenge",
): SignalScanRow {
  return {
    id,
    university_name: univ,
    admission_name: "자연",
    admission_type: "정시",
    track: "자연",
    region: "seoul",
    cutoff: 400,
    adjusted_cutoff: 400,
    my_score: 410,
    signal,
    probability: 0.7,
    probability_percent: 70,
    gap: 10,
    med_shift_applied: false,
  };
}

describe("pickJeongsiSignalForUniv", () => {
  it("정시 행이 없으면 null", () => {
    expect(pickJeongsiSignalForUniv([], "서강대")).toBeNull();
  });

  it("동일 대학 정시 행이 여러 개면 id가 가장 작은 행", () => {
    const items = [row(5, "서강대", "challenge"), row(3, "서강대", "safe")];
    const p = pickJeongsiSignalForUniv(items, "서강대");
    expect(p?.signal).toBe("safe");
  });

  it("빈 문자열이면 null", () => {
    expect(pickJeongsiSignalForUniv([row(1, "서강대", "safe")], "  ")).toBeNull();
  });
});
