/**
 * 대학(전형) 기준 내신 환산 등급을 계산합니다.
 * @param records `academic_records` 배열(학교/모의고사 중 내신(SCHOOL_GPA) 데이터가 포함될 수 있음)
 * @param rules `susi_gpa_rules` 행(반영 교과/진로선택 환산 규칙)
 * @returns 해당 대학 기준 환산 내신 등급(소수 2자리)
 */
export interface AcademicRecord {
  subject_name: string | null;
  credit_unit: number | null;
  school_grade: number | null;
  achievement_level: "A" | "B" | "C" | "D" | "E" | null;
}

export interface SusiGpaRules {
  include_subjects: string[];
  career_choice_conversion: Record<string, number>;
}

function validateFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`ValidationError: ${label} must be a finite number.`);
  }
}

export function calculateSusiGPA(
  records: AcademicRecord[],
  rules: SusiGpaRules,
): number {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("ValidationError: records must not be empty.");
  }

  if (!Array.isArray(rules.include_subjects)) {
    throw new Error("ValidationError: rules.include_subjects must be an array.");
  }

  const included = records.filter(
    (r) => r.subject_name != null && rules.include_subjects.includes(r.subject_name),
  );

  let weightedSum = 0;
  let totalCredits = 0;

  for (const record of included) {
    if (record.credit_unit == null || record.credit_unit <= 0) {
      continue;
    }

    const credit = record.credit_unit;
    validateFinite(credit, "record.credit_unit");

    // 진로선택과목 환산 우선 적용(해당되는 경우)
    if (record.achievement_level) {
      const converted = rules.career_choice_conversion[String(record.achievement_level)];
      if (Number.isFinite(converted)) {
        weightedSum += converted * credit;
        totalCredits += credit;
        continue;
      }
    }

    if (record.school_grade == null) {
      continue;
    }

    validateFinite(record.school_grade, "record.school_grade");
    weightedSum += record.school_grade * credit;
    totalCredits += credit;
  }

  if (totalCredits === 0) {
    throw new Error("ValidationError: total credit units must be greater than zero.");
  }

  return Number((weightedSum / totalCredits).toFixed(2));
}
