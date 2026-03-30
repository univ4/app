import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { NapchiRiskRow } from "@/lib/calculators/calcIntegratedStrategy";

function riskEmoji(level: NapchiRiskRow["riskLevel"]) {
  if (level === "high") return "🔴";
  if (level === "medium") return "🟡";
  return "🟢";
}

function riskLabelKo(level: NapchiRiskRow["riskLevel"]) {
  if (level === "high") return "높음";
  if (level === "medium") return "중간";
  return "낮음";
}

export type NapchiRiskCardProps = {
  row: NapchiRiskRow;
};

export function NapchiRiskCard({ row }: NapchiRiskCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {riskEmoji(row.riskLevel)}{" "}
          <span className="font-semibold">{row.university}</span>
          <span className="text-muted-foreground font-normal"> · {row.admissionType}</span>
        </CardTitle>
        <CardDescription>
          납치 리스크: {riskLabelKo(row.riskLevel)} ({row.riskLevel})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{row.message}</p>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            포기하게 되는 정시 기회
          </p>
          <p className="mt-1">{row.opportunityCost}</p>
        </div>
      </CardContent>
    </Card>
  );
}
