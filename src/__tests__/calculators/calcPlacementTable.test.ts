import { calcPlacementTable } from "@/lib/calculators/calcPlacementTable";

describe("calcPlacementTable", () => {
  it("안정·적정·도전으로 분류한다 (±5점 밴드)", () => {
    const myScore = 400;
    const r = calcPlacementTable({
      myScore,
      admissionRecords: [
        {
          univName: "A대",
          deptName: "안정",
          cutoffScore: 390,
          admissionType: "정시",
        },
        {
          univName: "B대",
          deptName: "적정",
          cutoffScore: 398,
          admissionType: "정시",
        },
        {
          univName: "C대",
          deptName: "도전",
          cutoffScore: 420,
          admissionType: "정시",
        },
      ],
    });

    expect(r.safe.map((x) => x.univName)).toContain("A대");
    expect(r.moderate.map((x) => x.univName)).toContain("B대");
    expect(r.challenge.map((x) => x.univName)).toContain("C대");

    const safeRow = r.safe.find((x) => x.univName === "A대")!;
    expect(safeRow.gap).toBe(10);
  });

  it("applyMedShift와 행별 medShiftCoeff로 보정 컷을 반영한다", () => {
    const myScore = 400;
    const r = calcPlacementTable({
      myScore,
      applyMedShift: true,
      admissionRecords: [
        {
          univName: "의대권",
          deptName: "의예",
          cutoffScore: 400,
          admissionType: "정시",
          medShiftCoeff: -3,
        },
      ],
    });
    // adjusted cutoff 397 → 400 > 397+5 is false; 400 >= 397-5 → moderate
    expect(r.moderate).toHaveLength(1);
    expect(r.moderate[0].gap).toBe(0);
  });

  it("입력이 비면 빈 세 구간을 반환한다", () => {
    const r = calcPlacementTable({
      myScore: 350,
      admissionRecords: [],
    });
    expect(r.safe).toEqual([]);
    expect(r.moderate).toEqual([]);
    expect(r.challenge).toEqual([]);
  });

  it("동일 gap이면 대학명·학과명 순으로 정렬한다", () => {
    const r = calcPlacementTable({
      myScore: 400,
      admissionRecords: [
        {
          univName: "가대",
          deptName: "컷390",
          cutoffScore: 390,
          admissionType: "정시",
        },
        {
          univName: "나대",
          deptName: "컷390",
          cutoffScore: 390,
          admissionType: "정시",
        },
      ],
    });
    expect(r.safe.map((x) => x.univName)).toEqual(["가대", "나대"]);

    const r2 = calcPlacementTable({
      myScore: 400,
      admissionRecords: [
        {
          univName: "동일대",
          deptName: "나학과",
          cutoffScore: 390,
          admissionType: "정시",
        },
        {
          univName: "동일대",
          deptName: "가학과",
          cutoffScore: 390,
          admissionType: "정시",
        },
      ],
    });
    expect(r2.safe.map((x) => x.deptName)).toEqual(["가학과", "나학과"]);

    const r3 = calcPlacementTable({
      myScore: 400,
      admissionRecords: [
        {
          univName: "후순위대",
          deptName: "컷385",
          cutoffScore: 385,
          admissionType: "정시",
        },
        {
          univName: "선순위대",
          deptName: "컷380",
          cutoffScore: 380,
          admissionType: "정시",
        },
      ],
    });
    expect(r3.safe.map((x) => x.gap)).toEqual([20, 15]);
  });

  it("정시가 아닌 전형은 제외한다", () => {
    const r = calcPlacementTable({
      myScore: 500,
      admissionRecords: [
        {
          univName: "X",
          deptName: "교과",
          cutoffScore: 3.5,
          admissionType: "학생부교과",
        },
      ],
    });
    expect(r.safe).toHaveLength(0);
    expect(r.moderate).toHaveLength(0);
    expect(r.challenge).toHaveLength(0);
  });

  it("myScore가 유한하지 않으면 ValidationError", () => {
    expect(() =>
      calcPlacementTable({
        myScore: Number.NaN,
        admissionRecords: [],
      }),
    ).toThrow(/ValidationError/);
  });

  it("전역 medShiftCoeff는 applyMedShift일 때 행 계수에 더해진다", () => {
    const r = calcPlacementTable({
      myScore: 400,
      applyMedShift: true,
      medShiftCoeff: -1,
      admissionRecords: [
        {
          univName: "T",
          deptName: "d",
          cutoffScore: 400,
          admissionType: "정시",
          medShiftCoeff: -2,
        },
      ],
    });
    // total med -3, same as first med-shift test → moderate
    expect(r.moderate).toHaveLength(1);
  });
});
