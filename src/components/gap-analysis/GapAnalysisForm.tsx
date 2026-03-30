"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";

export type GapAnalysisFormProps = {
  targetUniv: string;
  onTargetUnivChange: (value: string) => void;
  remainingWeeks: number;
  onRemainingWeeksChange: (value: number) => void;
  loading: boolean;
  onStart: () => void;
};

export function GapAnalysisForm({
  targetUniv,
  onTargetUnivChange,
  remainingWeeks,
  onRemainingWeeksChange,
  loading,
  onStart,
}: GapAnalysisFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">분석 설정</CardTitle>
        <CardDescription>
          적재된 세특 청크와 목표 대학 전형계획 청크만 근거로 분석합니다. 문장 대필은 제공하지
          않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="gap-target-univ">목표 대학</Label>
            <select
              id="gap-target-univ"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={targetUniv}
              onChange={(e) => onTargetUnivChange(e.target.value)}
              disabled={loading}
              required
              aria-label="목표 대학 선택"
            >
              <option value="" disabled>
                대학을 선택하세요
              </option>
              {GUIDELINE_PLAN_UNIV_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="gap-remaining-weeks">남은 기간 (주)</Label>
            <Input
              id="gap-remaining-weeks"
              type="number"
              min={1}
              max={104}
              value={remainingWeeks}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                onRemainingWeeksChange(Math.min(104, Math.max(1, n)));
              }}
              disabled={loading}
              aria-label="남은 기간 주 수"
            />
          </div>
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => onStart()}
          disabled={loading || targetUniv.trim().length === 0}
        >
          <Sparkles className="mr-2 size-4" aria-hidden />
          {loading ? "분석 중…" : "Gap 분석 시작"}
        </Button>
      </CardContent>
    </Card>
  );
}
