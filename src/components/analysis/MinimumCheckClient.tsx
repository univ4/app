"use client";

import { useMemo, useState } from "react";

import {
  checkSuneungMinimum,
  type SuneungGrades,
  type SuneungMinimumRule,
} from "@/lib/calculators/checkSuneungMinimum";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type MinimumCheckEntry = {
  university: string;
  admission_type: string;
  major_group: string;
  condition: string;
  rule: SuneungMinimumRule;
};

const SUBJECT_LABEL: Record<string, string> = {
  korean: "국",
  math: "수",
  english: "영",
  sci1: "과1",
  sci2: "과2",
};

function toKoreanCombination(subjects: string[]) {
  if (!subjects.length) return "-";
  return subjects.map((s) => SUBJECT_LABEL[s] ?? s).join("/");
}

function GapCell({ gap }: { gap: number }) {
  const text = Number.isFinite(gap)
    ? `${gap > 0 ? "+" : ""}${gap}`
    : "-";
  const className =
    !Number.isFinite(gap)
      ? ""
      : gap <= 0
        ? "text-green-600 font-medium"
        : "text-red-600 font-medium";
  return <span className={className}>{text}</span>;
}

function GradeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value}등급</span>
      </div>
      <input
        type="range"
        min={1}
        max={9}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function MinimumCheckClient({
  initialGrades,
  entries,
}: {
  initialGrades: SuneungGrades;
  entries: MinimumCheckEntry[];
}) {
  const [grades, setGrades] = useState<SuneungGrades>(initialGrades);

  const computedRows = useMemo(() => {
    return entries.map((entry) => {
      const result = checkSuneungMinimum(grades, entry.rule);
      return { ...entry, ...result };
    });
  }, [entries, grades]);

  const satisfiedRows = computedRows.filter((row) => row.satisfied);
  const unsatisfiedRows = computedRows.filter((row) => !row.satisfied);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>현재 등급 / 시뮬레이션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <GradeSlider
              label="국어"
              value={grades.korean}
              onChange={(next) => setGrades((prev) => ({ ...prev, korean: next }))}
            />
            <GradeSlider
              label="수학"
              value={grades.math}
              onChange={(next) => setGrades((prev) => ({ ...prev, math: next }))}
            />
            <GradeSlider
              label="영어"
              value={grades.english}
              onChange={(next) => setGrades((prev) => ({ ...prev, english: next }))}
            />
            <GradeSlider
              label="과탐1"
              value={grades.sci1}
              onChange={(next) => setGrades((prev) => ({ ...prev, sci1: next }))}
            />
            <GradeSlider
              label="과탐2"
              value={grades.sci2}
              onChange={(next) => setGrades((prev) => ({ ...prev, sci2: next }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수능최저 충족 결과</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-green-700">충족</h3>
            <ResultTable rows={satisfiedRows} dimUnmet={false} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-600">미충족</h3>
            <ResultTable rows={unsatisfiedRows} dimUnmet />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultTable({
  rows,
  dimUnmet,
}: {
  rows: Array<
    MinimumCheckEntry & {
      satisfied: boolean;
      best_combination: string[];
      achieved_sum: number;
      required_sum: number;
      gap: number;
      english_satisfied: boolean;
    }
  >;
  dimUnmet: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>대학</TableHead>
          <TableHead>전형</TableHead>
          <TableHead>조건</TableHead>
          <TableHead>최적조합</TableHead>
          <TableHead>달성합</TableHead>
          <TableHead>필요합</TableHead>
          <TableHead>여유</TableHead>
          <TableHead>판정</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8}>해당 항목이 없습니다.</TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={`${row.university}-${row.admission_type}-${row.condition}`}
              className={dimUnmet ? "opacity-50" : ""}
            >
              <TableCell>{row.university}</TableCell>
              <TableCell>{row.admission_type}</TableCell>
              <TableCell>{row.condition}</TableCell>
              <TableCell>{toKoreanCombination(row.best_combination)}</TableCell>
              <TableCell>
                {Number.isFinite(row.achieved_sum) ? row.achieved_sum : "-"}
              </TableCell>
              <TableCell>
                {Number.isFinite(row.required_sum) ? row.required_sum : "-"}
              </TableCell>
              <TableCell>
                <GapCell gap={row.gap} />
              </TableCell>
              <TableCell>
                {row.satisfied ? (
                  <Badge className="bg-green-500 text-white hover:bg-green-500">
                    충족
                  </Badge>
                ) : (
                  <Badge variant="outline">미충족</Badge>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

