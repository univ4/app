export interface SuneungGrades {
  korean: number;
  math: number;
  english: number;
  sci1: number;
  sci2: number;
}

export interface SuneungMinimumRule {
  condition: string; // "3개합6", "2개합4", "1개1등급"
  subjects: string[]; // ["korean", "math", "sci1", "sci2"] 등
  english_limit: number | null;
}

export interface MinimumCheckResult {
  satisfied: boolean;
  best_combination: string[];
  achieved_sum: number;
  required_sum: number;
  gap: number; // 음수 = 여유, 양수 = 부족
  english_satisfied: boolean;
}

export type ParsedMinimumCondition =
  | {
      type: "SUM";
      pickCount: number;
      requiredSum: number;
    }
  | {
      type: "ONE_GRADE";
      requiredGrade: number;
      requiredSum: number;
    };

function parseCondition(condition: string): ParsedMinimumCondition {
  const sumMatch = condition.match(/^(\d+)개합(\d+)$/);
  if (sumMatch) {
    return {
      type: "SUM",
      pickCount: Number(sumMatch[1]),
      requiredSum: Number(sumMatch[2]),
    };
  }

  const oneGradeMatch = condition.match(/^1개(\d+)등급$/);
  if (oneGradeMatch) {
    const requiredGrade = Number(oneGradeMatch[1]);
    return {
      type: "ONE_GRADE",
      requiredGrade,
      requiredSum: requiredGrade,
    };
  }

  throw new Error(`Unsupported condition format: ${condition}`);
}

/** 파싱 불가 시 `null` (Track1·API에서 조건문-only 규칙 처리용). */
export function parseSuneungMinimumCondition(
  condition: string,
): ParsedMinimumCondition | null {
  const c = condition?.trim();
  if (!c) return null;
  try {
    return parseCondition(c);
  } catch {
    return null;
  }
}

function getGradeBySubject(grades: SuneungGrades, subject: string): number {
  switch (subject) {
    case "korean":
      return grades.korean;
    case "math":
      return grades.math;
    case "english":
      return grades.english;
    case "sci1":
      return grades.sci1;
    case "sci2":
      return grades.sci2;
    default:
      throw new Error(`Unknown subject or invalid grade value: ${subject}`);
  }
}

export function getCombinations<T>(arr: T[], n: number): T[][] {
  if (n < 0 || n > arr.length) return [];
  if (n === 0) return [[]];
  if (n === 1) return arr.map((item) => [item]);

  const result: T[][] = [];
  for (let i = 0; i <= arr.length - n; i += 1) {
    const fixed = arr[i];
    const rest = arr.slice(i + 1);
    const tails = getCombinations(rest, n - 1);
    for (const tail of tails) {
      result.push([fixed, ...tail]);
    }
  }
  return result;
}

export function checkSuneungMinimum(
  grades: SuneungGrades,
  rule: SuneungMinimumRule,
): MinimumCheckResult {
  const parsed = parseCondition(rule.condition);
  const english_satisfied =
    rule.english_limit == null ? true : grades.english <= rule.english_limit;

  if (parsed.type === "ONE_GRADE") {
    const candidates = rule.subjects
      .map((subject) => ({
        subject,
        grade: getGradeBySubject(grades, subject),
      }))
      .sort((a, b) => a.grade - b.grade);

    const best = candidates[0];
    const achieved_sum = best ? best.grade : Number.POSITIVE_INFINITY;
    const required_sum = parsed.requiredSum;
    const gap = achieved_sum - required_sum;
    const satisfied = achieved_sum <= parsed.requiredGrade && english_satisfied;

    return {
      satisfied,
      best_combination: best ? [best.subject] : [],
      achieved_sum,
      required_sum,
      gap,
      english_satisfied,
    };
  }

  const pickCount = parsed.pickCount;
  const required_sum = parsed.requiredSum;
  const combos = getCombinations(rule.subjects, pickCount);

  let best_combination: string[] = [];
  let achieved_sum = Number.POSITIVE_INFINITY;

  for (const combo of combos) {
    const sum = combo.reduce((acc, subject) => acc + getGradeBySubject(grades, subject), 0);
    if (sum < achieved_sum) {
      achieved_sum = sum;
      best_combination = combo;
    }
  }

  const gap = achieved_sum - required_sum;
  const satisfied = achieved_sum <= required_sum && english_satisfied;

  return {
    satisfied,
    best_combination,
    achieved_sum,
    required_sum,
    gap,
    english_satisfied,
  };
}

