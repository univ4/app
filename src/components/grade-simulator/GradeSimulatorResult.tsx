"use client";

import { Badge } from "@/components/ui/badge";
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
import type { CalcGradeSimulatorResult } from "@/lib/calculators/calcGradeSimulator";

const SIGNAL_KO: Record<string, string> = {
  safe: "안정",
  moderate: "적정",
  challenge: "도전",
};

type Props = {
  result: CalcGradeSimulatorResult | null;
  hasCutoff: boolean;
};

export function GradeSimulatorResult({ result, hasCutoff }: Props) {
  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>시뮬레이션 결과</CardTitle>
          <CardDescription>과목과 목표 등급을 설정하면 여기에 요약이 표시됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const top3 = result.improvableSubjects.slice(0, 3);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>평균 내신</CardTitle>
          <CardDescription>
            단위수 가중 평균 · 등급이 낮을수록 유리합니다 (PRD P2-5).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-muted-foreground text-sm">현재</p>
            <p className="text-2xl font-semibold tabular-nums">{result.currentAvgGrade}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">시뮬레이션 후</p>
            <p className="text-2xl font-semibold tabular-nums text-primary">
              {result.simulatedAvgGrade}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">변화</p>
            <p
              className={
                result.gradeChange < 0
                  ? "text-2xl font-semibold tabular-nums text-emerald-600"
                  : result.gradeChange > 0
                    ? "text-2xl font-semibold tabular-nums text-amber-700"
                    : "text-2xl font-semibold tabular-nums"
              }
            >
              {result.gradeChange > 0 ? "+" : ""}
              {result.gradeChange}
            </p>
          </div>
        </CardContent>
      </Card>

      {hasCutoff && result.signalChange != null ? (
        <Card>
          <CardHeader>
            <CardTitle>합격 신호등 변화</CardTitle>
            <CardDescription>
              목표 대학 학생부교과 컷(입결 지표) 대비 — 특정 과목 등급 향상이 합격 가능성(신호등)에 미치는
              영향을 참고용으로 보여 줍니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              이전: {SIGNAL_KO[result.signalChange.before] ?? result.signalChange.before}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="text-sm">
              이후: {SIGNAL_KO[result.signalChange.after] ?? result.signalChange.after}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>개선 효과가 큰 과목 (상위 3)</CardTitle>
          <CardDescription>
            한 과목만 목표 등급으로 올렸을 때 전체 평균이 얼마나 좋아지는지(단위수 반영)입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>과목</TableHead>
                <TableHead className="text-right">단위</TableHead>
                <TableHead className="text-right">현재</TableHead>
                <TableHead className="text-right">목표</TableHead>
                <TableHead className="text-right">평균 개선</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top3.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    표시할 과목이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                top3.map((row, idx) => (
                  <TableRow key={`${row.subjectName}-${idx}`}>
                    <TableCell className="font-medium">{row.subjectName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.creditUnit}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.currentGrade}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.improvedGrade}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">
                      {row.gradeImpact > 0 ? "+" : ""}
                      {row.gradeImpact.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
