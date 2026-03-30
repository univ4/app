import type { RecordGapTargetUnivType } from "@/lib/calculators/calcRecordGapAnalysis";

export interface RecordCheckSummaryProps {
  criticalCount: number;
  targetUnivType: RecordGapTargetUnivType;
}

function suggestionsForTrack(type: RecordGapTargetUnivType): string[] {
  if (type === "science") {
    return [
      "이공·자연계 학종에서는 탐구·수학 관련 세특·진로 활동의 서술 충실도가 중요합니다. 과목당 세특 500자 이상을 목표로 수행평가·세부 역량을 구체적으로 적어 보세요.",
      "창체(자율·동아리·진로)는 영역별 200자 이상으로 활동 맥락·성과·배운 점을 연결해 서술하면 좋습니다.",
    ];
  }
  if (type === "liberal") {
    return [
      "인문·사회계열에서는 국어·사회 등 교과 세특과 독서·토론·동아리 활동의 일관된 서술이 도움이 됩니다. 세특은 과목당 500자 내외를 권장합니다.",
      "수상·행동특성이 비어 있으면 서류 평가에서 정보가 부족해 보일 수 있으니, 가능한 범위에서 정리해 입력하세요.",
    ];
  }
  return [
    "목표 계열을 프로필(목표 계열)에서 정하면, 그에 맞춘 보완 팁을 우선 표시할 수 있습니다.",
    "세특은 과목당 500자 이상, 창체는 영역별 200자 이상, 행동특성은 학년별 300자 이상을 가이드로 삼으면 좋습니다.",
  ];
}

export function RecordCheckSummary({ criticalCount, targetUnivType }: RecordCheckSummaryProps) {
  const lines = suggestionsForTrack(targetUnivType);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="font-semibold text-foreground">
        치명적 공백{" "}
        <span className="tabular-nums text-destructive">{criticalCount}</span>개
      </p>
      <div className="space-y-2 text-muted-foreground">
        <p className="font-medium text-foreground">보완 방법 제안</p>
        <ul className="list-inside list-disc space-y-1.5">
          {lines.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
