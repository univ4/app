"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type GradeSimulatorSubjectRow = {
  id: number;
  subjectName: string;
  currentGrade: number;
  creditUnit: number;
  semester: string;
};

type UnivOption = { univName: string; cutoffGrade: number };

type Props = {
  subjects: GradeSimulatorSubjectRow[];
  targetBySubjectKey: Record<string, number>;
  onTargetChange: (subjectKey: string, grade: number) => void;
  universities: UnivOption[];
  selectedUniv: string;
  onSelectUniv: (univName: string) => void;
  onRunSimulation: () => void;
};

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function subjectKey(row: GradeSimulatorSubjectRow) {
  return `${row.id}`;
}

export function GradeSimulatorForm({
  subjects,
  targetBySubjectKey,
  onTargetChange,
  universities,
  selectedUniv,
  onSelectUniv,
  onRunSimulation,
}: Props) {
  if (subjects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
        내신(SCHOOL_GPA) 행이 없거나, 등급·단위가 있는 과목이 없습니다.{" "}
        <span className="text-foreground">성적 관리</span>에서 내신을 입력해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="target-univ">목표 대학 (학생부교과 컷 자동)</Label>
          <select
            id="target-univ"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={selectedUniv}
            onChange={(e) => onSelectUniv(e.target.value)}
          >
            <option value="">선택 안 함</option>
            {universities.map((u) => (
              <option key={u.univName} value={u.univName}>
                {u.univName} (컷 {u.cutoffGrade})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학기</TableHead>
              <TableHead>과목</TableHead>
              <TableHead className="text-right">단위</TableHead>
              <TableHead className="text-right">현재</TableHead>
              <TableHead>목표 등급</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((row) => {
              const key = subjectKey(row);
              const val = targetBySubjectKey[key] ?? row.currentGrade;
              return (
                <TableRow key={key}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {row.semester || "—"}
                  </TableCell>
                  <TableCell className="font-medium">{row.subjectName}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.creditUnit}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.currentGrade}</TableCell>
                  <TableCell>
                    <select
                      className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full min-w-[5rem] rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      value={val}
                      onChange={(e) => onTargetChange(key, Number(e.target.value))}
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}등급
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button type="button" className="w-full sm:w-auto" onClick={onRunSimulation}>
        시뮬레이션
      </Button>
    </div>
  );
}
