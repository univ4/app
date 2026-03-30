import {
  calcSubjectAdvantage,
  mathSubjectChoiceToCalcKey,
} from "@/lib/calculators/calcSubjectAdvantage";

describe("calcSubjectAdvantage", () => {
  it("확통 선택 → 수학 반영비율이 상대적으로 낮은 대학이 유리", () => {
    const rules = [
      { universityName: "저수학대", mathRatio: 0.2, science2Bonus: 0 },
      { universityName: "중간대", mathRatio: 0.35, science2Bonus: 0 },
      { universityName: "고수학대", mathRatio: 0.45, science2Bonus: 0 },
    ];
    const r = calcSubjectAdvantage({
      mathSubject: "hwaktongjung",
      sciSubjects: ["생명과학Ⅰ"],
      targetUnivs: ["저수학대", "중간대", "고수학대"],
      scoringRules: rules,
    });
    expect(r.advantageUnivs).toContain("저수학대");
    expect(r.disadvantageUnivs).toContain("고수학대");
    expect(r.summary).toContain("확률과통계");
  });

  it("미적분 선택 → 수학 반영비율이 상대적으로 높은 대학이 유리", () => {
    const rules = [
      { universityName: "저수학대", mathRatio: 0.2, science2Bonus: 0 },
      { universityName: "중간대", mathRatio: 0.35, science2Bonus: 0 },
      { universityName: "고수학대", mathRatio: 0.45, science2Bonus: 0 },
    ];
    const r = calcSubjectAdvantage({
      mathSubject: "mijeok",
      sciSubjects: ["물리학Ⅰ"],
      targetUnivs: ["저수학대", "중간대", "고수학대"],
      scoringRules: rules,
    });
    expect(r.advantageUnivs).toContain("고수학대");
    expect(r.disadvantageUnivs).toContain("저수학대");
    expect(r.summary).toContain("미적분");
  });

  it("탐구 2과목(과탐) → 과탐Ⅱ 가산점이 있는 대학이 유리 쪽에 포함", () => {
    const rules = [
      { universityName: "가산대", mathRatio: 0.35, science2Bonus: 0.03 },
      { universityName: "무가산대", mathRatio: 0.35, science2Bonus: 0 },
    ];
    const r = calcSubjectAdvantage({
      mathSubject: "mijeok",
      sciSubjects: ["화학Ⅰ", "지구과학Ⅰ"],
      targetUnivs: ["가산대", "무가산대"],
      scoringRules: rules,
    });
    expect(r.advantageUnivs).toContain("가산대");
    expect(r.advantageUnivs).not.toContain("무가산대");
  });

  it("지원 불가 대학은 유불리 분석 결과 목록에서 제외", () => {
    const rules = [
      { universityName: "A대", mathRatio: 0.25, science2Bonus: 0 },
      { universityName: "B대", mathRatio: 0.4, science2Bonus: 0 },
    ];
    const r = calcSubjectAdvantage({
      mathSubject: "hwaktongjung",
      sciSubjects: ["생명과학Ⅰ", "화학Ⅰ"],
      targetUnivs: ["A대", "B대"],
      scoringRules: rules,
      ineligibleUniversityNames: ["B대"],
    });
    const all = [...r.advantageUnivs, ...r.disadvantageUnivs, ...r.neutralUnivs];
    expect(all).not.toContain("B대");
    expect(all).toContain("A대");
  });
});

describe("mathSubjectChoiceToCalcKey", () => {
  it("DB 수학 선택값을 계산기 키로 매핑", () => {
    expect(mathSubjectChoiceToCalcKey("미적분")).toBe("mijeok");
    expect(mathSubjectChoiceToCalcKey("기하")).toBe("giha");
    expect(mathSubjectChoiceToCalcKey("확률과통계")).toBe("hwaktongjung");
  });
});

describe("calcSubjectAdvantage 엣지", () => {
  it("목표 대학에 맞는 반영 규칙이 없으면 안내 문구만 반환", () => {
    const r = calcSubjectAdvantage({
      mathSubject: "mijeok",
      sciSubjects: [],
      targetUnivs: ["서강대"],
      scoringRules: [],
    });
    expect(r.advantageUnivs).toHaveLength(0);
    expect(r.summary).toContain("반영 규칙");
  });

  it("동일 대학 복수 규칙은 수학 비율·가산의 최대값으로 병합", () => {
    const r = calcSubjectAdvantage({
      mathSubject: "hwaktongjung",
      sciSubjects: ["화학Ⅰ"],
      targetUnivs: ["드문대", "기준대"],
      scoringRules: [
        { universityName: "드문대", mathRatio: 0.2, science2Bonus: 0 },
        { universityName: "드문대", mathRatio: 0.45, science2Bonus: 0 },
        { universityName: "기준대", mathRatio: 0.35, science2Bonus: 0 },
      ],
    });
    expect(r.advantageUnivs).toContain("기준대");
    expect(r.disadvantageUnivs).toContain("드문대");
  });
});
