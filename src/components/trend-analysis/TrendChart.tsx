"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import type { CalcAdmissionTrendResult } from "@/lib/calculators/calcAdmissionTrend";

export type TrendChartPoint = {
  year: number;
  cutoffScore: number;
  competitionRatio: number;
};

type TrendChartProps = {
  records: TrendChartPoint[];
  trend: CalcAdmissionTrendResult | null;
  loading?: boolean;
};

function TrendArrow({ trend }: { trend: CalcAdmissionTrendResult["trend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <TrendingUp className="size-5" aria-hidden />
        <span className="font-medium">상승</span>
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-rose-700">
        <TrendingDown className="size-5" aria-hidden />
        <span className="font-medium">하락</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="size-5" aria-hidden />
      <span className="font-medium">유지</span>
    </span>
  );
}

export function TrendChart({ records, trend, loading }: TrendChartProps) {
  const chartData = records.map((r) => ({
    year: String(r.year),
    cutoff: r.cutoffScore,
    competition: r.competitionRatio,
  }));

  return (
    <div className="space-y-4 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground">연도별 컷오프 추이</h2>
        {trend && !loading && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">최근 2개년 방향</span>
            <Badge variant="secondary" className="h-auto min-h-8 gap-1.5 px-2 py-1.5 text-sm font-normal">
              <TrendArrow trend={trend.trend} />
            </Badge>
            <span className="text-muted-foreground text-xs">
              변화율 {trend.changeRate >= 0 ? "+" : ""}
              {trend.changeRate.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground py-12 text-center text-sm">불러오는 중…</p>
      ) : chartData.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          표시할 컷오프 데이터가 없습니다. 대학·모집단위·전형을 선택해 주세요.
        </p>
      ) : (
        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 12 }}
                label={{ value: "컷", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => {
                  const v = value as number | string | undefined;
                  const text =
                    typeof v === "number" ? v.toFixed(2) : v === undefined ? "—" : String(v);
                  return [text, "컷오프"];
                }}
                labelFormatter={(label) => `${label}학년도`}
              />
              <Line
                type="monotone"
                dataKey="cutoff"
                name="컷오프"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {trend && !loading && (
        <p className="text-muted-foreground border-t border-border pt-3 text-sm leading-relaxed">
          {trend.analysis}
        </p>
      )}
    </div>
  );
}
