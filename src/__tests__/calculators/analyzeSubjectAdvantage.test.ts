import { analyzeSubjectAdvantage } from "@/lib/calculators/analyzeSubjectAdvantage";
import {
  SUBJECT_YEAR,
  type SubjectProfile,
  type UnivSubjectRequirement,
  type University,
} from "@/types/subject";

function baseProfile(over?: Partial<SubjectProfile>): SubjectProfile {
  return {
    student_id: "00000000-0000-4000-8000-000000000001",
    year: SUBJECT_YEAR,
    korean_subject: "언어와매체",
    math_subject: "미적분",
    science1: "물리학Ⅰ",
    science2: "화학Ⅰ",
    social1: null,
    social2: null,
    second_foreign: null,
    ...over,
  };
}

describe("analyzeSubjectAdvantage", () => {
  describe("AC: 자격·우대·불가 분류", () => {
    it("happy: ineligible과 advantageous를 분리해 반환", () => {
      const profile = baseProfile();

      const okReq: UnivSubjectRequirement = {
        id: "r1",
        univ_id: "u1",
        dept_id: "d1",
        year: SUBJECT_YEAR,
        required_math: ["미적분"],
        required_science: ["물리학Ⅰ"],
        preferred_subjects: { inquiry_subjects: ["화학Ⅰ"], note: "탐구 우대" },
        disqualified_subjects: null,
        notes: null,
      };

      const badReq: UnivSubjectRequirement = {
        id: "r2",
        univ_id: "u2",
        dept_id: "d2",
        year: SUBJECT_YEAR,
        required_math: ["기하"],
        required_science: null,
        preferred_subjects: {},
        disqualified_subjects: null,
        notes: null,
      };

      const target: University[] = [
        { id: "univ-a", name: "A대", requirement: okReq },
        { id: "univ-b", name: "B대", requirement: badReq },
      ];

      const { advantageous, disadvantageous, ineligible } = analyzeSubjectAdvantage(
        profile,
        target,
      );

      expect(ineligible.some((u) => u.id === "univ-b")).toBe(true);
      expect(advantageous.some((u) => u.id === "univ-a")).toBe(true);
      expect(disadvantageous.length).toBe(0);
    });

    it("엣지: 자격은 있으나 우대 불일치 경고만 있으면 disadvantageous", () => {
      const profile = baseProfile();
      const req: UnivSubjectRequirement = {
        id: "r3",
        univ_id: "u3",
        dept_id: "d3",
        year: SUBJECT_YEAR,
        required_math: ["미적분"],
        required_science: null,
        preferred_subjects: { inquiry_subjects: ["지구과학Ⅰ"] },
        disqualified_subjects: null,
        notes: null,
      };
      const { advantageous, disadvantageous, ineligible } = analyzeSubjectAdvantage(
        profile,
        [{ id: "univ-c", name: "C대", requirement: req }],
      );
      expect(ineligible.length).toBe(0);
      expect(advantageous.length).toBe(0);
      expect(disadvantageous.some((u) => u.id === "univ-c")).toBe(true);
    });
  });

  describe("AC: profile.year 검증", () => {
    it("SUBJECT_YEAR가 아니면 throw", () => {
      const profile = baseProfile({ year: 2026 as never });
      expect(() =>
        analyzeSubjectAdvantage(profile, []),
      ).toThrow("ValidationError");
    });
  });

  describe("엣지: 우대·경고 없이 eligible만 충족", () => {
    it("현재 구현: 세 분류 어디에도 포함되지 않음", () => {
      const profile = baseProfile();
      const req: UnivSubjectRequirement = {
        id: "r4",
        univ_id: "u4",
        dept_id: "d4",
        year: SUBJECT_YEAR,
        required_math: ["미적분"],
        required_science: null,
        preferred_subjects: null,
        disqualified_subjects: null,
        notes: null,
      };
      const r = analyzeSubjectAdvantage(profile, [
        { id: "univ-d", name: "D대", requirement: req },
      ]);
      expect(r.advantageous.length + r.disadvantageous.length + r.ineligible.length).toBe(
        0,
      );
    });
  });
});
