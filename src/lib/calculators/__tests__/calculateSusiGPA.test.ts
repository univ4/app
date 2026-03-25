import {
  calculateSusiGPA,
  type AcademicRecord,
  type SusiGpaRules,
} from "../calculateSusiGPA";

const rules: SusiGpaRules = {
  include_subjects: ["수학I", "영어I", "물리학I"],
  career_choice_conversion: {
    A: 1.5,
    B: 2.5,
    C: 3.5,
  },
};

describe("calculateSusiGPA", () => {
  it("calculates weighted GPA with included subjects", () => {
    const records: AcademicRecord[] = [
      { subject_name: "수학I", credit_unit: 4, school_grade: 2, achievement_level: null },
      { subject_name: "영어I", credit_unit: 3, school_grade: 3, achievement_level: null },
    ];
    expect(calculateSusiGPA(records, rules)).toBe(2.43);
  });

  it("applies career-choice conversion for achievement A", () => {
    const records: AcademicRecord[] = [
      { subject_name: "물리학I", credit_unit: 2, school_grade: null, achievement_level: "A" },
      { subject_name: "수학I", credit_unit: 4, school_grade: 2, achievement_level: null },
    ];
    expect(calculateSusiGPA(records, rules)).toBe(1.83);
  });

  it("ignores subjects not included by rule", () => {
    const records: AcademicRecord[] = [
      { subject_name: "국어I", credit_unit: 4, school_grade: 1, achievement_level: null },
      { subject_name: "수학I", credit_unit: 4, school_grade: 3, achievement_level: null },
    ];
    expect(calculateSusiGPA(records, rules)).toBe(3);
  });

  it("throws when total credit unit is zero", () => {
    const records: AcademicRecord[] = [
      { subject_name: "수학I", credit_unit: 0, school_grade: 2, achievement_level: null },
    ];
    expect(() => calculateSusiGPA(records, rules)).toThrow("ValidationError");
  });

  it("throws ValidationError when records are empty", () => {
    expect(() => calculateSusiGPA([], rules)).toThrow("ValidationError");
  });
});
