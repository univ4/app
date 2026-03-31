"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SubjectKey = "korean" | "math" | "inquiry1" | "inquiry2";

type SubjectInput = {
  label: string;
  raw: string;
  mean: string;
  stddev: string;
};

type SubjectResult = {
  label: string;
  raw: number;
  mean: number;
  stddev: number;
  z: number;
  standardScore: number;
  percentile: number;
  expectedGrade: number;
  expectedRank: number | null;
};

const SUBJECTS: Record<SubjectKey, string> = {
  korean: "국어",
  math: "수학",
  inquiry1: "탐구1",
  inquiry2: "탐구2",
};

const DEFAULT_INPUTS: Record<SubjectKey, SubjectInput> = {
  korean: { label: SUBJECTS.korean, raw: "", mean: "", stddev: "" },
  math: { label: SUBJECTS.math, raw: "", mean: "", stddev: "" },
  inquiry1: { label: SUBJECTS.inquiry1, raw: "", mean: "", stddev: "" },
  inquiry2: { label: SUBJECTS.inquiry2, raw: "", mean: "", stddev: "" },
};

function erfApprox(x: number) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-(absX * absX)));
  return sign * y;
}

function normalCdf(z: number) {
  return 0.5 * (1 + erfApprox(z / Math.sqrt(2)));
}

function percentileToGrade(percentile: number) {
  if (percentile >= 96) return 1;
  if (percentile >= 89) return 2;
  if (percentile >= 77) return 3;
  if (percentile >= 60) return 4;
  if (percentile >= 40) return 5;
  if (percentile >= 23) return 6;
  if (percentile >= 11) return 7;
  if (percentile >= 4) return 8;
  return 9;
}

export default function ZScorePage() {
  const [inputs, setInputs] = useState<Record<SubjectKey, SubjectInput>>(DEFAULT_INPUTS);
  const [applicants, setApplicants] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const applicantCount = useMemo(() => {
    const parsed = Number(applicants);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
  }, [applicants]);

  const results = useMemo<SubjectResult[]>(() => {
    if (!submitted) return [];
    return (Object.keys(inputs) as SubjectKey[])
      .map((key) => {
        const item = inputs[key];
        const raw = Number(item.raw);
        const mean = Number(item.mean);
        const stddev = Number(item.stddev);

        if (!Number.isFinite(raw) || !Number.isFinite(mean) || !Number.isFinite(stddev) || stddev <= 0) {
          return null;
        }

        const z = (raw - mean) / stddev;
        const standardScore = z * 20 + 100;
        const percentile = Math.max(0, Math.min(100, Math.round(normalCdf(z) * 100)));
        const expectedGrade = percentileToGrade(percentile);
        const expectedRank = applicantCount
          ? Math.max(1, Math.min(applicantCount, Math.ceil(((100 - percentile) / 100) * applicantCount)))
          : null;

        return {
          label: item.label,
          raw,
          mean,
          stddev,
          z,
          standardScore,
          percentile,
          expectedGrade,
          expectedRank,
        };
      })
      .filter((row): row is SubjectResult => row !== null);
  }, [applicantCount, inputs, submitted]);

  function updateSubject(key: SubjectKey, field: keyof SubjectInput, value: string) {
    setInputs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 bg-background p-4 sm:p-6">
      <PageHeader
        title="Z점수 판별"
        description="/dashboard/zscore — 과목별 원점수·평균·표준편차 기반 Z점수 계산"
        helpHref="/dashboard/help#scores"
      />

      <Card>
        <CardHeader>
          <CardTitle>입력</CardTitle>
          <CardDescription>
            과목별 원점수, 평균, 표준편차를 입력하면 Z점수·표준점수·백분위·예상 등급을 계산합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="응시 인원 (선택)">
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={applicants}
                onChange={(event) => setApplicants(event.target.value)}
                placeholder="예: 300"
              />
            </Field>
          </div>

          {(Object.keys(inputs) as SubjectKey[]).map((key) => (
            <div key={key} className="grid gap-4 md:grid-cols-4">
              <Field label={`${inputs[key].label} 원점수`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={inputs[key].raw}
                  onChange={(event) => updateSubject(key, "raw", event.target.value)}
                />
              </Field>
              <Field label={`${inputs[key].label} 평균`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={inputs[key].mean}
                  onChange={(event) => updateSubject(key, "mean", event.target.value)}
                />
              </Field>
              <Field label={`${inputs[key].label} 표준편차`}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={inputs[key].stddev}
                  onChange={(event) => updateSubject(key, "stddev", event.target.value)}
                />
              </Field>
              <Field label={`${inputs[key].label} 계산식`}>
                <div className="text-muted-foreground flex min-h-10 items-center rounded-md border px-3 text-sm">
                  z = (원점수 - 평균) / 표준편차
                </div>
              </Field>
            </div>
          ))}

          <Button type="button" onClick={() => setSubmitted(true)}>
            계산
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계산 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground text-sm">입력값을 채우고 계산 버튼을 눌러주세요.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>과목</TableHead>
                    <TableHead>Z점수</TableHead>
                    <TableHead>표준점수(예상)</TableHead>
                    <TableHead>백분위(예상)</TableHead>
                    <TableHead>예상 등급</TableHead>
                    <TableHead>예상 석차</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell>{row.z.toFixed(2)}</TableCell>
                      <TableCell>{Math.round(row.standardScore)}</TableCell>
                      <TableCell>{row.percentile}</TableCell>
                      <TableCell>{row.expectedGrade}</TableCell>
                      <TableCell>{row.expectedRank ? `${row.expectedRank}등 / ${applicantCount}명` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          <p className="text-muted-foreground">
            참고: 본 계산은 입력한 평균/표준편차를 기준으로 한 추정치이며, 대학·시험기관의 공식 산출 결과와 차이가 있을 수 있습니다.
          </p>
          <p className="text-muted-foreground">
            최종 판단은 모집요강, 대학별 반영 방식, 실제 표준점수/백분위 공지와 함께 확인하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
