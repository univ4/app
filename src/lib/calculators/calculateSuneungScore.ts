/**
 * 대학별 정시 환산점수를 계산합니다.
 * @param scores 영영/과탐 등 영역별 표준점수/등급 데이터
 * @param rules `university_scoring_rules` 행(반영비율/영어 환산표/과탐II 가산점)
 * @returns 대학 자체 환산점수(소수 2자리 반올림)
 */
export interface SuneungScores {
  /** 국어 표준점수 */
  korean_standard_score: number;
  /** 수학 표준점수 */
  math_standard_score: number;
  /** 영어 등급(1~9 등) */
  english_grade: number;
  /** 과탐1 표준점수 */
  sci1_standard_score: number;
  /** 과탐2 표준점수 */
  sci2_standard_score: number;
  /** 과탐II 여부(해당 시 science_2_bonus 가산점 적용) */
  sci2_is_type_two?: boolean;
}

export interface UniversityScoringRules {
  korean_ratio: number;
  math_ratio: number;
  english_ratio: number;
  science_ratio: number;
  science_2_bonus: number;
  /** 영어 등급을 환산점수로 변환하는 테이블 */
  english_conversion_table: Record<string, number>;
}

function validateFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`ValidationError: ${label} must be a finite number.`);
  }
}

export function calculateSuneungScore(
  scores: SuneungScores,
  rules: UniversityScoringRules,
): number {
  validateFinite(scores.korean_standard_score, "scores.korean_standard_score");
  validateFinite(scores.math_standard_score, "scores.math_standard_score");
  validateFinite(scores.english_grade, "scores.english_grade");
  validateFinite(scores.sci1_standard_score, "scores.sci1_standard_score");
  validateFinite(scores.sci2_standard_score, "scores.sci2_standard_score");

  validateFinite(rules.korean_ratio, "rules.korean_ratio");
  validateFinite(rules.math_ratio, "rules.math_ratio");
  validateFinite(rules.english_ratio, "rules.english_ratio");
  validateFinite(rules.science_ratio, "rules.science_ratio");
  validateFinite(rules.science_2_bonus, "rules.science_2_bonus");

  const englishConverted = rules.english_conversion_table[String(scores.english_grade)];
  if (!Number.isFinite(englishConverted)) {
    throw new Error("ValidationError: english conversion table is missing for this grade.");
  }

  const scienceAverage =
    (scores.sci1_standard_score + scores.sci2_standard_score) / 2;

  const korean = scores.korean_standard_score * rules.korean_ratio;
  const math = scores.math_standard_score * rules.math_ratio;
  const english = englishConverted * rules.english_ratio;
  const science = scienceAverage * rules.science_ratio;

  const science2Bonus =
    scores.sci2_is_type_two === true
      ? scores.sci2_standard_score * rules.science_2_bonus
      : 0;

  /**
   * 과탐II 가산점 적용 방식:
   * - DB의 `science_2_bonus`는 0.03 (= 3%) 입니다.
   * - 과탐2 표준점수(sci2_standard_score)에 대해 "추가분"만 계산해 합산에 더합니다.
   * - 예: sci2_standard_score=65, science_2_bonus=0.03
   *   => bonus 추가분 = 65 * 0.03 = 1.95
   *   => (과탐2가 이미 scienceAverage에 포함되어 있으므로) 총점에 1.95만 추가로 반영됩니다.
   * - 이는 `sci2`의 1.03배(65*1.03=66.95)로 바꿨을 때와 같은 '추가분' 관점으로 해석할 수 있습니다.
   */

  const totalScore = korean + math + english + science + science2Bonus;
  return Number(totalScore.toFixed(2));
}
