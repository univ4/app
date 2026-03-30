"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GachaejeomApiSuccess } from "@/lib/gachaejeom/gachaejeomApiTypes";

function signalLabel(signal: GachaejeomApiSuccess["univResults"][0]["signal"]): string {
  if (signal === "safe") return "안정";
  if (signal === "moderate") return "적정";
  return "도전";
}

function signalEmoji(signal: GachaejeomApiSuccess["univResults"][0]["signal"]): string {
  if (signal === "safe") return "🟢";
  if (signal === "moderate") return "🟡";
  return "🔴";
}

type Props = {
  data: GachaejeomApiSuccess | null;
};

export function GachaejeomResult({ data }: Props) {
  if (!data) return null;

  const { estimatedScores, warning, univResults, meta } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>예상 표준점수·백분위 (근사)</CardTitle>
          <CardDescription>
            전년도 분포를 가정한 추정값입니다. 표준점수 스케일은 평균 100·표준편차 20에 맞춥니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>영역</TableHead>
                <TableHead className="text-right">추정 표준점수</TableHead>
                <TableHead className="text-right">추정 백분위 (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>국어</TableCell>
                <TableCell className="text-right">
                  {estimatedScores.korean.standardScore}
                </TableCell>
                <TableCell className="text-right">
                  {estimatedScores.korean.percentile}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>수학</TableCell>
                <TableCell className="text-right">
                  {estimatedScores.math.standardScore}
                </TableCell>
                <TableCell className="text-right">{estimatedScores.math.percentile}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>탐구1</TableCell>
                <TableCell className="text-right">
                  {estimatedScores.science1.standardScore}
                </TableCell>
                <TableCell className="text-right">
                  {estimatedScores.science1.percentile}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>탐구2</TableCell>
                <TableCell className="text-right">
                  {estimatedScores.science2.standardScore}
                </TableCell>
                <TableCell className="text-right">
                  {estimatedScores.science2.percentile}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-muted-foreground text-sm">{warning}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>18개 대학 정시 환산·신호등</CardTitle>
          <CardDescription>
            요강 18개 대학·자연계열 반영비 기준. 입결 컷이 있는 정시 행만 표시합니다. (
            {meta.universities_with_result}개 · {meta.duration_ms}ms)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {univResults.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              환산 규칙 또는 정시 컷 데이터가 없어 결과를 표시할 수 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>대학</TableHead>
                  <TableHead>모집단위</TableHead>
                  <TableHead className="text-right">환산점수</TableHead>
                  <TableHead className="text-right">컷</TableHead>
                  <TableHead>신호등</TableHead>
                  <TableHead className="text-right">확률(%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {univResults.map((r) => (
                  <TableRow key={r.university_name}>
                    <TableCell className="font-medium">{r.university_name}</TableCell>
                    <TableCell className="max-w-[10rem] truncate text-muted-foreground text-sm">
                      {r.admission_name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.converted_score.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.cutoff}</TableCell>
                    <TableCell>
                      {signalEmoji(r.signal)} {signalLabel(r.signal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.probability_percent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
