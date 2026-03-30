/**
 * Track 1: 재수생(N수) 지원 전략 참고 (규칙 기반, 합격 보장 없음).
 */

export type NsuTargetType = "jeongsi" | "susi" | "both";

export interface CalcNsuStrategyParams {
  nsuYear: number;
  suneungScore?: number;
  prevScore?: number;
  gpa?: number;
  targetType: NsuTargetType;
}

export interface CalcNsuStrategyResult {
  recommendedStrategy: string;
  jeongsiAdvantage: boolean;
  susiCaution: string[];
  keyUnivTypes: string[];
  scoreImprovement?: number;
  warnings: string[];
}

const SUSI_BASE_CAUTION = [
  "3학년 2학기 내신·세특은 전형·대학에 따라 반영이 제한되거나 없을 수 있습니다. 해당 연도 모집요강을 확인하세요.",
  "학생부교과·학생부종합 등은 N수생·졸업생에게 불리한 조건을 두는 전형이 많습니다. 지원 자격·실제 합격 사례를 반드시 확인하세요.",
] as const;

function scoreDelta(
  suneungScore: number | undefined,
  prevScore: number | undefined,
): number | undefined {
  if (suneungScore == null || prevScore == null) return undefined;
  return suneungScore - prevScore;
}

function pushTargetTypeNote(
  targetType: NsuTargetType,
  parts: string[],
): void {
  if (targetType === "jeongsi") {
    parts.push("목표가 정시 위주이면 환산·군·최저 조건을 우선 점검하세요.");
  } else if (targetType === "susi") {
    parts.push(
      "목표가 수시 위주이면 지원 자격·학생부 반영 범위·면접 유무를 전형별로 좁혀 가세요.",
    );
  } else {
    parts.push("정시·수시를 병행할 때는 원서 일정·수시 납치 정책까지 함께 설계하세요.");
  }
}

/**
 * 재수 연차·점수 추이·내신·목표 전형을 바탕으로 참고용 전략 문구를 생성합니다.
 */
export function calcNsuStrategy(params: CalcNsuStrategyParams): CalcNsuStrategyResult {
  const { nsuYear, suneungScore, prevScore, gpa, targetType } = params;
  const year = Number.isFinite(nsuYear) && nsuYear >= 1 ? Math.floor(nsuYear) : 1;
  const improvement = scoreDelta(suneungScore, prevScore);

  const warnings: string[] = [
    "본 결과는 참고용이며 입학 합격을 보장하지 않습니다. 최종 판단은 공식 모집요강·입학처 안내를 따르세요.",
  ];

  const susiCaution: string[] = [...SUSI_BASE_CAUTION];

  if (gpa == null) {
    warnings.push("내신 정보가 없으면 수시에서 학생부 반영 전형의 불확실성이 큽니다. 정시 비중을 우선 검토하는 것이 일반적입니다.");
  } else if (gpa > 3) {
    warnings.push(
      `제출 내신 평균 등급이 ${gpa.toFixed(1)}등급대로, N수생에게는 수시 학생부 경쟁에서 불리할 수 있습니다.`,
    );
  }

  // 삼수 이상: 정시 집중 + 수시 최소화
  if (year >= 2) {
    const parts = [
      `${year === 2 ? "삼수" : `${year + 1}수`} 이상은 재도전 기간이 길어질수록 학생부 경쟁에서 불리해지기 쉬우므로, 정시 비중을 높이고 수시 지원은 최소·집중하는 편을 권합니다.`,
    ];
    if (improvement != null && improvement > 0) {
      parts.push(`전년 대비 수능 점수가 ${improvement}점 상승했으므로 정시 컷·환산 점수 시뮬레이션을 강화하세요.`);
    } else if (improvement != null && improvement < 0) {
      parts.push(
        `전년 대비 수능 점수가 ${improvement}점 하락했습니다. 정시만으로는 리스크가 클 수 있어, 지원 가능한 수시 전형을 소수 정예로 병행 검토하세요.`,
      );
    }
    pushTargetTypeNote(targetType, parts);

    return {
      recommendedStrategy: parts.join(" "),
      jeongsiAdvantage: true,
      susiCaution,
      keyUnivTypes: [
        "수능 반영 비중이 높은 정시 전형",
        "수능최저·교과 위주로 경쟁이 명확한 전형(요강 확인)",
        "지역·실기 등 정시에서 규칙이 분명한 유형",
      ],
      scoreImprovement: improvement,
      warnings,
    };
  }

  // 재수 1년
  const parts: string[] = [];

  if (improvement != null && improvement > 0) {
    parts.push(
      `전년 대비 수능 점수가 ${improvement}점 상승했습니다. 정시에서 유리해질 여지가 있으므로 환산·군 배치·최저를 중심으로 전략을 강화하는 것을 권합니다.`,
    );
    if (targetType !== "susi") {
      susiCaution.push("점수 상승이 있어도 학생부 반영 전형은 N수 기준·등급 불리가 남을 수 있습니다.");
    }
  } else if (improvement != null && improvement < 0) {
    parts.push(
      `전년 대비 수능 점수가 ${improvement}점 하락했습니다. 정시 컷 대비 여유가 줄었을 수 있어, 지원 가능한 수시 전형을 넓게 분산·검토하는 편을 권합니다.`,
    );
    susiCaution.push("점수 하락 시 정시 단일 승부보다 수시·정시 균형과 전형별 자격 요건을 우선 확인하세요.");
  } else {
    parts.push(
      "전년도·현재 수능 점수를 모두 입력하면 전년 대비 추이에 맞춘 권고가 더 구체화됩니다. 기본적으로 N수는 학생부 반영에서 불리한 경우가 많아 정시 비중을 우선 검토하는 것이 일반적입니다.",
    );
  }

  if (gpa == null) {
    parts.push("내신 제출이 없거나 반영이 약하면 정시 중심으로 지원 범위를 잡는 것을 권합니다.");
  } else {
    parts.push(`제출 내신 등급을 ${gpa.toFixed(1)}등급대로 가정할 때, 수시 학종·교과 전형은 경쟁 강도를 보수적으로 보세요.`);
  }

  pushTargetTypeNote(targetType, parts);

  if (improvement != null && improvement < 0) {
    return {
      recommendedStrategy: parts.join(" "),
      jeongsiAdvantage: false,
      susiCaution,
      keyUnivTypes: [
        "수시에서 교과·논술 등 지원 자격이 맞는 전형",
        "학생부 반영 비중이 낮거나 수능 최저가 분명한 전형(요강 확인)",
        "정시 병행 시 가·나·다군·최저를 동시에 점검",
      ],
      scoreImprovement: improvement,
      warnings,
    };
  }

  const jeongsiAdvantage = improvement == null || improvement >= 0;

  return {
    recommendedStrategy: parts.join(" "),
    jeongsiAdvantage,
    susiCaution,
    keyUnivTypes: [
      "정시 환산에서 유리한 대학·학과(반영비·과탐 가산)",
      "수능최저가 명확한 수시 전형(자격만 충족 시)",
      "지역균형·특성화 등 규칙이 분명한 전형(요강 확인)",
    ],
    scoreImprovement: improvement,
    warnings,
  };
}
