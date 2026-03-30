import {
  jsonbIndicatesSuneungMinimum,
  matchesNoInterviewFilter,
  matchesSuneungMinFilter,
} from "@/lib/explore/susiRuleHelpers";

describe("susiRuleHelpers", () => {
  it("jsonbIndicatesSuneungMinimum — 조건 문자열이 있으면 true", () => {
    expect(jsonbIndicatesSuneungMinimum({ condition: "3개합6", subjects: [] })).toBe(true);
  });

  it("jsonbIndicatesSuneungMinimum — 없음/빈 객체는 false", () => {
    expect(jsonbIndicatesSuneungMinimum(null)).toBe(false);
    expect(jsonbIndicatesSuneungMinimum({})).toBe(false);
    expect(jsonbIndicatesSuneungMinimum({ condition: "없음" })).toBe(false);
  });

  it("matchesSuneungMinFilter — 정시는 없음 필터에서 항상 통과", () => {
    expect(matchesSuneungMinFilter("정시", null, "true")).toBe(true);
    expect(matchesSuneungMinFilter("정시", null, "false")).toBe(false);
  });

  it("matchesNoInterviewFilter — 면접 없음: 학종+false만 통과", () => {
    expect(matchesNoInterviewFilter("학생부종합", false, "true")).toBe(true);
    expect(matchesNoInterviewFilter("학생부종합", null, "true")).toBe(false);
    expect(matchesNoInterviewFilter("정시", null, "true")).toBe(true);
  });
});
