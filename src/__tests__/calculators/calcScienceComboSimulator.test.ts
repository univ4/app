import {
  calcScienceComboSimulator,
  isInquirySubjectTypeTwoName,
  isScienceInquirySubjectName,
} from "@/lib/calculators/calcScienceComboSimulator";

const baseRules = [
  { univName: "가나대", science2Bonus: 0.03, mathRatio: 0.35 },
  { univName: "다라대", science2Bonus: 0, mathRatio: 0.3 },
];

describe("calcScienceComboSimulator", () => {
  it("과탐Ⅱ 2과목이면 가산 비율이 있는 대학이 유리 목록에 포함된다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "물리학Ⅱ", science2: "화학Ⅱ" },
      scoringRules: baseRules,
    });
    expect(r.isSci2Combo).toBe(true);
    expect(r.advantageUnivs.map((x) => x.univName)).toContain("가나대");
    expect(r.advantageUnivs.find((x) => x.univName === "가나대")?.bonusPoint).toBeCloseTo(0.03, 5);
    expect(r.disadvantageUnivs.some((x) => x.univName === "다라대")).toBe(true);
  });

  it("과탐Ⅰ 2과목이면 가산 적용 대학이 없다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "물리학Ⅰ", science2: "화학Ⅰ" },
      scoringRules: baseRules,
    });
    expect(r.isSci2Combo).toBe(false);
    expect(r.advantageUnivs).toHaveLength(0);
    expect(r.disadvantageUnivs).toHaveLength(2);
    expect(r.recommendation).toContain("과탐Ⅰ 2과목");
  });

  it("과탐Ⅰ+Ⅱ 혼합(탐구2가 과탐Ⅱ)이면 절충안 문구와 가산 적용 대학이 있다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "물리학Ⅰ", science2: "화학Ⅱ" },
      scoringRules: baseRules,
    });
    expect(r.isSci2Combo).toBe(false);
    expect(r.advantageUnivs.map((x) => x.univName)).toContain("가나대");
    expect(r.recommendation).toContain("절충");
  });

  it("scoringRules가 비어 있으면 목록이 비고 안내 문구가 있다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "물리학Ⅰ", science2: "화학Ⅰ" },
      scoringRules: [],
    });
    expect(r.advantageUnivs).toHaveLength(0);
    expect(r.disadvantageUnivs).toHaveLength(0);
    expect(r.recommendation).toContain("반영 규칙 데이터가 없어");
  });

  it("동일 대학 규칙이 여러 행이면 가산·수학 반영비 최댓값으로 병합한다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "물리학Ⅰ", science2: "화학Ⅱ" },
      scoringRules: [
        { univName: "가나대", science2Bonus: 0.02, mathRatio: 0.3 },
        { univName: "가나대", science2Bonus: 0.05, mathRatio: 0.2 },
      ],
    });
    expect(r.advantageUnivs).toHaveLength(1);
    expect(r.advantageUnivs[0]?.bonusPoint).toBeCloseTo(0.05, 5);
  });

  it("탐구1이 비어 있으면 규칙이 있어도 선택 안내 문구가 나온다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "", science2: "화학Ⅰ" },
      scoringRules: baseRules,
    });
    expect(r.recommendation).toContain("탐구1·탐구2를 모두 선택");
  });

  it("사탐+과탐Ⅱ처럼 혼합 탐구는 가산은 되나 절충·과탐2과목 문구가 아닌 일반 안내가 나올 수 있다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "사회문화", science2: "화학Ⅱ" },
      scoringRules: baseRules,
    });
    expect(r.advantageUnivs.map((x) => x.univName)).toContain("가나대");
    expect(r.recommendation).toContain("비과탐 탐구");
  });

  it("과탐 가산이 있는 대학이어도 탐구2가 과탐Ⅱ가 아니면 유리 목록에 들어가지 않는다", () => {
    const r = calcScienceComboSimulator({
      combo: { science1: "화학Ⅱ", science2: "물리학Ⅰ" },
      scoringRules: baseRules,
    });
    expect(r.advantageUnivs).toHaveLength(0);
    expect(r.disadvantageUnivs.some((x) => x.univName === "가나대")).toBe(true);
  });
});

describe("isScienceInquirySubjectName / isInquirySubjectTypeTwoName", () => {
  it("과탐 과목명을 판별한다", () => {
    expect(isScienceInquirySubjectName("생명과학Ⅰ")).toBe(true);
    expect(isScienceInquirySubjectName("사회문화")).toBe(false);
  });

  it("Ⅱ 접미사를 판별한다", () => {
    expect(isInquirySubjectTypeTwoName("지구과학Ⅱ")).toBe(true);
    expect(isInquirySubjectTypeTwoName("지구과학Ⅰ")).toBe(false);
  });
});
