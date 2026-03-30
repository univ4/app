import { buildScienceSubjectPipe } from "@/lib/gachaejeom/buildScienceSubjectPipe";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";

const EPS = 1e-9;

export interface CalcScienceComboSimulatorParams {
  combo: {
    science1: string;
    science2: string;
  };
  scoringRules: {
    univName: string;
    science2Bonus: number;
    mathRatio: number;
  }[];
}

export interface CalcScienceComboSimulatorResult {
  advantageUnivs: { univName: string; bonusPoint: number; reason: string }[];
  disadvantageUnivs: { univName: string; reason: string }[];
  isSci2Combo: boolean;
  recommendation: string;
}

function normalizeName(s: string): string {
  return String(s).trim();
}

function mergeRules(
  rules: CalcScienceComboSimulatorParams["scoringRules"],
): Map<string, { science2Bonus: number; mathRatio: number }> {
  const m = new Map<string, { science2Bonus: number; mathRatio: number }>();
  for (const r of rules) {
    const name = normalizeName(r.univName);
    if (!name) continue;
    const prev = m.get(name);
    if (!prev) {
      m.set(name, { science2Bonus: r.science2Bonus, mathRatio: r.mathRatio });
    } else {
      m.set(name, {
        science2Bonus: Math.max(prev.science2Bonus, r.science2Bonus),
        mathRatio: Math.max(prev.mathRatio, r.mathRatio),
      });
    }
  }
  return m;
}

/** 물리·화학·생명·지구 탐구 과목(과탐) 여부 — 사탐 등은 false */
export function isScienceInquirySubjectName(name: string): boolean {
  const n = normalizeName(name);
  if (!n) return false;
  return /물리학|화학|생명과학|지구과학/.test(n);
}

/** 탐구 과목명에 Ⅱ(또는 II)가 포함되는지 — 과탐Ⅱ 여부 */
export function isInquirySubjectTypeTwoName(name: string): boolean {
  const t = normalizeName(name);
  if (!t) return false;
  return t.includes("Ⅱ") || t.includes("II");
}

/**
 * 탐구1·탐구2 선택과 `university_scoring_rules.science_2_bonus` 기준으로
 * 과탐Ⅱ 가산 적용 가능 대학과 그렇지 않은 대학을 나눕니다. (Track 1)
 * - 가산 적용: `calculateSuneungScore`와 동일하게 탐구2 과목이 과탐Ⅱ일 때(`parseSci2IsTypeTwo`)
 */
export function calcScienceComboSimulator(
  params: CalcScienceComboSimulatorParams,
): CalcScienceComboSimulatorResult {
  const s1 = normalizeName(params.combo.science1);
  const s2 = normalizeName(params.combo.science2);

  const ruleMap = mergeRules(params.scoringRules);

  const qualifiesForBonus =
    s1.length > 0 &&
    s2.length > 0 &&
    parseSci2IsTypeTwo(buildScienceSubjectPipe(s1, s2));

  const isSci2Combo =
    isScienceInquirySubjectName(s1) &&
    isScienceInquirySubjectName(s2) &&
    isInquirySubjectTypeTwoName(s1) &&
    isInquirySubjectTypeTwoName(s2);

  const bothScienceInquiry =
    isScienceInquirySubjectName(s1) && isScienceInquirySubjectName(s2);
  const bothSci1Only =
    bothScienceInquiry &&
    !isInquirySubjectTypeTwoName(s1) &&
    !isInquirySubjectTypeTwoName(s2);
  const mixedSci1And2 =
    bothScienceInquiry &&
    !isInquirySubjectTypeTwoName(s1) &&
    isInquirySubjectTypeTwoName(s2);

  const advantageUnivs: CalcScienceComboSimulatorResult["advantageUnivs"] = [];
  const disadvantageUnivs: CalcScienceComboSimulatorResult["disadvantageUnivs"] = [];

  for (const [univName, v] of ruleMap) {
    const bonus = v.science2Bonus;
    if (bonus > EPS && qualifiesForBonus) {
      advantageUnivs.push({
        univName,
        bonusPoint: bonus,
        reason: `과탐Ⅱ 가산 비율 ${(bonus * 100).toFixed(1)}%가 탐구2 표준점수에 추가 반영됩니다.`,
      });
    } else if (bonus > EPS && !qualifiesForBonus) {
      disadvantageUnivs.push({
        univName,
        reason:
          "이 대학은 과탐Ⅱ 가산이 있으나, 탐구2 과목명이 과탐Ⅱ가 아니면 가산점이 적용되지 않습니다.",
      });
    } else {
      disadvantageUnivs.push({
        univName,
        reason: "이 대학(자연계열 규칙)은 과탐Ⅱ 가산 비율이 0입니다.",
      });
    }
  }

  const sortKo = (a: string, b: string) => a.localeCompare(b, "ko");
  advantageUnivs.sort((a, b) => sortKo(a.univName, b.univName));
  disadvantageUnivs.sort((a, b) => sortKo(a.univName, b.univName));

  let recommendation: string;
  if (ruleMap.size === 0) {
    recommendation = "반영 규칙 데이터가 없어 조합만 표시합니다. 대학별 규칙이 로드되면 가산 여부를 비교할 수 있습니다.";
  } else if (!s1 || !s2) {
    recommendation = "탐구1·탐구2를 모두 선택하면 과탐Ⅱ 가산 적용 여부를 판정할 수 있습니다.";
  } else if (isSci2Combo) {
    recommendation =
      "과탐Ⅱ 2과목이면 과탐Ⅱ 가산 비율이 있는 대학에서 혜택을 최대로 받을 수 있습니다. 다만 과목 부담이 큽니다.";
  } else if (bothSci1Only) {
    recommendation =
      "과탐Ⅰ 2과목은 과탐Ⅱ 가산점은 없고, 부담은 상대적으로 작습니다.";
  } else if (mixedSci1And2) {
    recommendation =
      "과탐Ⅰ+Ⅱ 혼합(탐구2가 과탐Ⅱ)은 절충안입니다. 가산 대학에서는 가산점이 적용되고, 과탐Ⅰ 2과목보다 탐구 난이도는 높습니다.";
  } else if (!qualifiesForBonus) {
    recommendation =
      "탐구2가 과탐Ⅱ가 아니면 정시 환산에서 과탐Ⅱ 가산점이 붙지 않습니다. 가산이 있는 대학을 노린다면 탐구2에 과탐Ⅱ를 두는 구성을 검토하세요.";
  } else {
    recommendation =
      "선택한 탐구 조합 기준으로 가산 적용 가능 대학과 미적용 대학을 구분했습니다. 사회·한국사 등 비과탐 탐구는 정시 자연계열 과탐 가산 판정과 다를 수 있습니다.";
  }

  return {
    advantageUnivs,
    disadvantageUnivs,
    isSci2Combo,
    recommendation,
  };
}
