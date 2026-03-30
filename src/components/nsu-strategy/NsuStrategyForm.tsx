"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NsuTargetType } from "@/lib/calculators/calcNsuStrategy";

const selectClass =
  "border-input bg-background text-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";

export interface NsuStrategyFormValues {
  nsuYear: number;
  suneungScore: string;
  prevScore: string;
  gpa: string;
  targetType: NsuTargetType;
}

export const nsuStrategyFormDefaults: NsuStrategyFormValues = {
  nsuYear: 1,
  suneungScore: "",
  prevScore: "",
  gpa: "",
  targetType: "both",
};

function parseOptionalNumber(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function NsuStrategyForm(props: {
  values: NsuStrategyFormValues;
  onChange: (v: NsuStrategyFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const { values, onChange, onSubmit, loading } = props;

  return (
    <div className="space-y-6 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nsu-year">재수 연차</Label>
          <select
            id="nsu-year"
            className={selectClass}
            value={String(values.nsuYear)}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ ...values, nsuYear: Number.isFinite(n) ? n : 1 });
            }}
          >
            <option value={1}>재수 (1년)</option>
            <option value={2}>삼수 (2년)</option>
            <option value={3}>4수 (3년)</option>
            <option value={4}>5수 이상 (4년+)</option>
          </select>
          <p className="text-muted-foreground text-xs">1=재수, 2=삼수 … N수 연차를 선택합니다.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-type">목표 전형</Label>
          <select
            id="target-type"
            className={selectClass}
            value={values.targetType}
            onChange={(e) =>
              onChange({ ...values, targetType: e.target.value as NsuTargetType })
            }
          >
            <option value="jeongsi">정시 위주</option>
            <option value="susi">수시 위주</option>
            <option value="both">정시·수시 병행</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="prev-score">전년도 수능 점수 (환산·원점수 등 일관된 기준)</Label>
          <Input
            id="prev-score"
            inputMode="decimal"
            placeholder="예: 420"
            value={values.prevScore}
            onChange={(e) => onChange({ ...values, prevScore: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sun-score">현재(또는 최근) 수능 점수</Label>
          <Input
            id="sun-score"
            inputMode="decimal"
            placeholder="예: 435"
            value={values.suneungScore}
            onChange={(e) => onChange({ ...values, suneungScore: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gpa">내신 평균 등급 (선택)</Label>
          <Input
            id="gpa"
            inputMode="decimal"
            placeholder="예: 2.5"
            value={values.gpa}
            onChange={(e) => onChange({ ...values, gpa: e.target.value })}
          />
        </div>
      </div>

      <Button type="button" className="w-full sm:w-auto" disabled={loading} onClick={onSubmit}>
        {loading ? "계산 중…" : "전략 적용"}
      </Button>
    </div>
  );
}

export function buildNsuStrategyPayload(values: NsuStrategyFormValues) {
  return {
    nsuYear: values.nsuYear,
    suneungScore: parseOptionalNumber(values.suneungScore),
    prevScore: parseOptionalNumber(values.prevScore),
    gpa: parseOptionalNumber(values.gpa),
    targetType: values.targetType,
  };
}
