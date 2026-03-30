"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalcNsuStrategyResult } from "@/lib/calculators/calcNsuStrategy";
import { AlertTriangle } from "lucide-react";

export function NsuStrategyResult(props: { data: CalcNsuStrategyResult | null }) {
  const { data } = props;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">권고 전략</CardTitle>
          <CardDescription>Track 1 규칙 기반 참고 안내 (합격 보장 없음)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground text-sm leading-relaxed">{data.recommendedStrategy}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={data.jeongsiAdvantage ? "default" : "secondary"}>
              정시 유리도: {data.jeongsiAdvantage ? "유리한 편" : "불리한 편"}
            </Badge>
            {data.scoreImprovement != null ? (
              <Badge variant="outline">전년 대비 점수 차: {data.scoreImprovement > 0 ? "+" : ""}
                {data.scoreImprovement}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">정시·수시 분석</CardTitle>
          <CardDescription>내신·N수 연차·점수 추이를 반영한 요약</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {data.keyUnivTypes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="flex flex-row items-start gap-2 space-y-0 pb-2">
          <AlertTriangle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <CardTitle className="text-destructive text-base">N수생·졸업생 수시 시 주의</CardTitle>
            <CardDescription className="text-destructive/90 mt-1">
              학생부 3-2 미반영·N수 불리 전형 등
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="text-foreground list-inside list-disc space-y-1 text-sm">
            {data.susiCaution.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">안내</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
