"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { CalcScienceComboSimulatorResult } from "@/lib/calculators/calcScienceComboSimulator";

function pct(bonus: number): string {
  return `${(bonus * 100).toFixed(1)}%`;
}

export function ScienceComboResult({ result }: { result: CalcScienceComboSimulatorResult | null }) {
  if (!result) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>조합 요약</CardTitle>
          <CardDescription>
            과탐Ⅱ 2과목 여부:{" "}
            <span className="text-foreground font-medium">{result.isSci2Combo ? "예" : "아니오"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.recommendation}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>과탐Ⅱ 가산 적용 가능 대학</CardTitle>
          <CardDescription>
            DB의 과탐Ⅱ 가산 비율이 0보다 크고, 탐구2가 과탐Ⅱ로 판정될 때 정시 환산에 반영되는 대학입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.advantageUnivs.length === 0 ? (
            <p className="text-muted-foreground text-sm">해당 대학이 없습니다.</p>
          ) : (
            <ul className="list-inside list-disc space-y-2 text-sm">
              {result.advantageUnivs.map((u) => (
                <li key={u.univName}>
                  <span className="font-medium">{u.univName}</span>
                  <span className="text-muted-foreground"> — 가산 비율 {pct(u.bonusPoint)}</span>
                  <div className="text-muted-foreground mt-0.5 pl-0 text-xs">{u.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가산 미적용·해당 없음</CardTitle>
          <CardDescription>
            가산 비율이 0이거나, 가산 정책은 있으나 현재 조합으로는 적용되지 않는 경우입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.disadvantageUnivs.length === 0 ? (
            <p className="text-muted-foreground text-sm">항목이 없습니다.</p>
          ) : (
            <ul className="text-muted-foreground max-h-[28rem] space-y-2 overflow-y-auto text-sm">
              {result.disadvantageUnivs.map((u) => (
                <li key={u.univName} className="border-b border-border/60 pb-2 last:border-0">
                  <span className="text-foreground font-medium">{u.univName}</span>
                  <div className="mt-0.5">{u.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
