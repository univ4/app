import type { MathSubjectChoice } from "@/types/subject";

/** Track1 유불리(수학 반영비·과탐II 가산) 분석용 수학 코드 */
export type CalcMathSubjectKey = "mijeok" | "giha" | "hwaktongjung";

export interface SubjectAdvantageScoringRow {
  universityName: string;
  mathRatio: number;
  science2Bonus: number;
}

export interface CalcSubjectAdvantageParams {
  mathSubject: CalcMathSubjectKey;
  sciSubjects: string[];
  targetUnivs: string[];
  /** `university_scoring_rules` 등에서 적재한 행(대학별 중복 시 API에서 병합 가능) */
  scoringRules: SubjectAdvantageScoringRow[];
  /** `checkSubjectEligibility` 기준 지원 불가 대학은 유불리 분석에서 제외 */
  ineligibleUniversityNames?: string[];
}

const EPS = 1e-9;

export function mathSubjectChoiceToCalcKey(subject: MathSubjectChoice): CalcMathSubjectKey {
  if (subject === "미적분") return "mijeok";
  if (subject === "기하") return "giha";
  return "hwaktongjung";
}

function normalizeSciSubjects(sciSubjects: string[]): string[] {
  const out: string[] = [];
  for (const s of sciSubjects) {
    const t = String(s).trim();
    if (t.length > 0) out.push(t);
  }
  return out;
}

function mergeScoringRules(
  rules: SubjectAdvantageScoringRow[],
): Map<string, { mathRatio: number; science2Bonus: number }> {
  const m = new Map<string, { mathRatio: number; science2Bonus: number }>();
  for (const r of rules) {
    const name = String(r.universityName).trim();
    if (!name) continue;
    const prev = m.get(name);
    if (!prev) {
      m.set(name, { mathRatio: r.mathRatio, science2Bonus: r.science2Bonus });
    } else {
      m.set(name, {
        mathRatio: Math.max(prev.mathRatio, r.mathRatio),
        science2Bonus: Math.max(prev.science2Bonus, r.science2Bonus),
      });
    }
  }
  return m;
}

function medianOfSorted(nums: number[]): number {
  if (nums.length === 0) return 0;
  const n = nums.length;
  if (n % 2 === 1) return nums[(n - 1) / 2]!;
  return (nums[n / 2 - 1]! + nums[n / 2]!) / 2;
}

/**
 * 선택 수학·탐구 조합과 정시 반영비(`math_ratio`, `science_2_bonus`) 기준 유불리 후보를 나눕니다. (Track 1, LLM 없음)
 * - 확통: 수학 반영비가 상대적으로 낮은 대학이 유리
 * - 미적·기하: 수학 반영비가 상대적으로 높은 대학이 유리
 * - 탐구 2과목(과탐): `science_2_bonus`가 있는 대학은 가산 반영으로 유리 쪽에 포함
 */
export function calcSubjectAdvantage(params: CalcSubjectAdvantageParams): {
  advantageUnivs: string[];
  disadvantageUnivs: string[];
  neutralUnivs: string[];
  summary: string;
} {
  const { mathSubject, sciSubjects, targetUnivs, scoringRules, ineligibleUniversityNames } = params;
  const ineligible = new Set(
    (ineligibleUniversityNames ?? []).map((u) => String(u).trim()).filter(Boolean),
  );
  const targets = [...new Set(targetUnivs.map((u) => String(u).trim()).filter(Boolean))];
  const ruleMap = mergeScoringRules(scoringRules);

  const normalizedSci = normalizeSciSubjects(sciSubjects);
  const hasTwoInquiry = normalizedSci.length >= 2;

  const eligible = targets.filter((u) => !ineligible.has(u) && ruleMap.has(u));
  if (eligible.length === 0) {
    return {
      advantageUnivs: [],
      disadvantageUnivs: [],
      neutralUnivs: [],
      summary:
        "목표 대학 중 반영 규칙이 있고 지원 가능한 대학이 없어 유불리 분석을 수행하지 못했습니다. 프로필·목표 대학·요강 데이터를 확인해 주세요.",
    };
  }

  const ratios = eligible.map((u) => ruleMap.get(u)!.mathRatio).sort((a, b) => a - b);
  const median = medianOfSorted(ratios);

  const advantage = new Set<string>();
  const disadvantage = new Set<string>();
  const neutral = new Set<string>();

  const isHwaktong = mathSubject === "hwaktongjung";

  for (const u of eligible) {
    const r = ruleMap.get(u)!.mathRatio;
    if (isHwaktong) {
      if (r < median - EPS) advantage.add(u);
      else if (r > median + EPS) disadvantage.add(u);
      else neutral.add(u);
    } else {
      if (r > median + EPS) advantage.add(u);
      else if (r < median - EPS) disadvantage.add(u);
      else neutral.add(u);
    }
  }

  if (hasTwoInquiry) {
    for (const u of eligible) {
      if (ruleMap.get(u)!.science2Bonus > EPS) {
        disadvantage.delete(u);
        neutral.delete(u);
        advantage.add(u);
      }
    }
  }

  const sortNames = (a: string, b: string) => a.localeCompare(b, "ko");

  const advantageUnivs = [...advantage].sort(sortNames);
  const disadvantageUnivs = [...disadvantage].sort(sortNames);
  const neutralUnivs = [...neutral].sort(sortNames);

  const mathLabel =
    mathSubject === "hwaktongjung"
      ? "확률과통계"
      : mathSubject === "mijeok"
        ? "미적분"
        : "기하";
  const bonusNote = hasTwoInquiry ? " 탐구 2과목 응시 시 과탐Ⅱ 가산(>0) 대학은 유리 쪽에 반영했습니다." : "";
  const summary = `${mathLabel} 선택 기준으로 목표 ${eligible.length}개교 중 수학 반영비(median ${median.toFixed(3)})를 비교했습니다. 유리 ${advantageUnivs.length}개, 불리 ${disadvantageUnivs.length}개, 중립 ${neutralUnivs.length}개입니다.${bonusNote}`;

  return { advantageUnivs, disadvantageUnivs, neutralUnivs, summary };
}
