"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type JeongsiGunStrategyPayload = {
  riskLevel: "safe" | "moderate" | "danger";
  warnings: string[];
  safeNetExists: boolean;
  recommendation: string;
  cards: {
    ga: {
      university: string;
      signal: string;
      probability_percent: number;
      gap: number;
    } | null;
    na: {
      university: string;
      signal: string;
      probability_percent: number;
      gap: number;
    } | null;
    da: {
      university: string;
      signal: string;
      probability_percent: number;
      gap: number;
    } | null;
  };
};

const RISK_UI: Record<
  JeongsiGunStrategyPayload["riskLevel"],
  { emoji: string; label: string; tone: string }
> = {
  safe: { emoji: "🟢", label: "낮음", tone: "text-emerald-800" },
  moderate: { emoji: "🟡", label: "중간", tone: "text-amber-800" },
  danger: { emoji: "🔴", label: "높음", tone: "text-red-800" },
};

function slotLine(
  label: string,
  row: JeongsiGunStrategyPayload["cards"]["ga"],
): string {
  if (!row) return `${label}: 미선택`;
  return `${label}: ${row.university} (${row.signal}, 차이 ${row.gap})`;
}

export type GunAnalysisResultProps = {
  strategy: JeongsiGunStrategyPayload | null;
  ragSummary: string | null;
  loading?: boolean;
  error?: string | null;
};

export function GunAnalysisResult({
  strategy,
  ragSummary,
  loading,
  error,
}: GunAnalysisResultProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>조합 분석</CardTitle>
          <CardDescription>계산 및 정시자료 요약을 불러오는 중입니다…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">오류</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!strategy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>조합 분석</CardTitle>
          <CardDescription>「분석 실행」을 누르면 Track1 위험도와 정시자료 RAG 요약이 표시됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const risk = RISK_UI[strategy.riskLevel];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>조합 분석 · 위험도</CardTitle>
          <CardDescription>가·나·다군 선택과 합격 신호등(정시) 기준 Track 1 요약</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">위험도</div>
            <div className={`flex flex-wrap items-center gap-2 font-semibold ${risk.tone}`}>
              <span aria-hidden>{risk.emoji}</span>
              <span>{risk.label}</span>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">안전망</div>
            <p className="text-foreground">
              {strategy.safeNetExists ? "✅ 안정권 신호가 최소 1개 군에 있습니다." : "⚠️ 안정권 신호가 없습니다."}
            </p>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">선택 요약</div>
            <ul className="text-foreground list-inside list-disc space-y-1">
              <li>{slotLine("가군", strategy.cards.ga)}</li>
              <li>{slotLine("나군", strategy.cards.na)}</li>
              <li>{slotLine("다군", strategy.cards.da)}</li>
            </ul>
          </div>

          {strategy.warnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="font-medium text-amber-900 dark:text-amber-100">경고</div>
              <ul className="mt-1 list-inside list-disc text-amber-900 dark:text-amber-100">
                {strategy.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <div className="text-muted-foreground mb-1">권고</div>
            <p className="text-foreground leading-relaxed">{strategy.recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {ragSummary ? (
        <Card>
          <CardHeader>
            <CardTitle>정시자료 기반 요약 (RAG)</CardTitle>
            <CardDescription>
              guideline_chunks 정시자료(서울권·수도권·전문대·총론) 검색 + Claude 요약. 합격 보장 아님.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{ragSummary}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
