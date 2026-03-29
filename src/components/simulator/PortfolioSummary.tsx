"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calcNapchiRisk } from "@/lib/calculators/calcNapchiRisk";
import { calcPortfolioRisk, type PortfolioRiskCard } from "@/lib/calculators/calcPortfolioRisk";

import type { SimulatorPortfolioCard } from "./PortfolioBuilder";

type PortfolioSummaryProps = {
  cards: SimulatorPortfolioCard[];
  jeonsiSignals: { university: string; signal: string }[];
};

function riskLevelLabel(level: "balanced" | "aggressive" | "too_safe") {
  if (level === "balanced") return "균형 양호";
  if (level === "aggressive") return "공격적";
  return "과도한 안정";
}

function napchiLabel(level: "low" | "medium" | "high") {
  if (level === "low") return "낮음";
  if (level === "medium") return "중간";
  return "높음";
}

export function PortfolioSummary({ cards, jeonsiSignals }: PortfolioSummaryProps) {
  const riskInput: PortfolioRiskCard[] = useMemo(
    () =>
      cards.map((c) => ({
        university: c.university,
        department: c.department,
        admissionType: c.admissionType,
        signal: c.signal,
        hasSuneungMinimum: c.hasSuneungMinimum,
      })),
    [cards],
  );

  const analysis = useMemo(() => calcPortfolioRisk({ cards: riskInput }), [riskInput]);

  const napchiScenarios = useMemo(() => {
    return cards.map((c) => ({
      key: c.clientKey,
      title: `${c.university} (${c.admissionType})`,
      ...calcNapchiRisk({
        card: { university: c.university, signal: c.signal },
        suneungSignals: jeonsiSignals,
      }),
    }));
  }, [cards, jeonsiSignals]);

  const total = analysis.safeCount + analysis.moderateCount + analysis.challengeCount;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>포트폴리오 분석 (§9.1)</CardTitle>
          <CardDescription>
            도전 {analysis.challengeCount}장 / 적정 {analysis.moderateCount}장 / 안정 {analysis.safeCount}장
            {total > 0 ? ` (${pct(analysis.challengeCount)}% / ${pct(analysis.moderateCount)}% / ${pct(analysis.safeCount)}%)` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">리스크 성향: {riskLevelLabel(analysis.riskLevel)}</Badge>
            <Badge variant="secondary">수능최저 전형: {analysis.suneungMinimumCount}장</Badge>
          </div>

          {total > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">비율</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {analysis.challengeCount > 0 ? (
                  <div
                    className="bg-destructive/80"
                    style={{ width: `${pct(analysis.challengeCount)}%` }}
                    title={`도전 ${analysis.challengeCount}`}
                  />
                ) : null}
                {analysis.moderateCount > 0 ? (
                  <div
                    className="bg-secondary"
                    style={{ width: `${pct(analysis.moderateCount)}%` }}
                    title={`적정 ${analysis.moderateCount}`}
                  />
                ) : null}
                {analysis.safeCount > 0 ? (
                  <div
                    className="bg-emerald-600/70"
                    style={{ width: `${pct(analysis.safeCount)}%` }}
                    title={`안정 ${analysis.safeCount}`}
                  />
                ) : null}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-destructive/80" /> 도전
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-secondary" /> 적정
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-600/70" /> 안정
                </span>
              </div>
            </div>
          ) : null}

          {analysis.warnings.length > 0 ? (
            <ul className="list-disc space-y-1 border-l-2 border-amber-500/60 pl-4 text-sm text-amber-900 dark:text-amber-100">
              {analysis.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : total > 0 ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-200">현재 설정에서 §9.1 기준 경고 없음</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수시 납치 리스크 (§9.2)</CardTitle>
          <CardDescription>카드별 정시 신호와의 기회비용 요약 (Track 1 휴리스틱)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-sm">카드를 추가하면 시나리오가 표시됩니다.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {napchiScenarios.map((s) => (
                <li key={s.key} className="rounded-md border border-border p-3">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                    <span>납치 리스크: {napchiLabel(s.riskLevel)}</span>
                    <Badge variant={s.riskLevel === "high" ? "destructive" : "secondary"}>{s.riskLevel}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{s.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
