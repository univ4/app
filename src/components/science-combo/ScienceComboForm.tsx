"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const selectClass =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

/** 탐구 선택지 — 과탐Ⅰ·Ⅱ 및 사탐(혼합 시뮬용) */
export const INQUIRY_SUBJECT_OPTIONS = [
  "",
  "물리학Ⅰ",
  "물리학Ⅱ",
  "화학Ⅰ",
  "화학Ⅱ",
  "생명과학Ⅰ",
  "생명과학Ⅱ",
  "지구과학Ⅰ",
  "지구과학Ⅱ",
  "사회문화",
  "생활과윤리",
  "한국지리",
  "세계지리",
  "동아시아사",
  "세계사",
  "경제",
  "정치와법",
] as const;

export type ScienceComboFormValues = {
  science1: string;
  science2: string;
};

const defaultValues: ScienceComboFormValues = {
  science1: "",
  science2: "",
};

export function ScienceComboForm({
  values,
  onChange,
  onAnalyze,
  loading,
}: {
  values: ScienceComboFormValues;
  onChange: (next: ScienceComboFormValues) => void;
  onAnalyze: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>탐구 조합 선택</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          탐구1·탐구2 순서는 수능 선택 순서와 같게 두면 됩니다. 과탐Ⅱ 가산은 정시 환산에서{" "}
          <span className="text-foreground font-medium">탐구2</span>가 과탐Ⅱ일 때 적용됩니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="science-combo-1">탐구1</Label>
            <select
              id="science-combo-1"
              className={selectClass}
              value={values.science1}
              onChange={(e) => onChange({ ...values, science1: e.target.value })}
            >
              <option value="">선택</option>
              {INQUIRY_SUBJECT_OPTIONS.filter((o) => o !== "").map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="science-combo-2">탐구2</Label>
            <select
              id="science-combo-2"
              className={selectClass}
              value={values.science2}
              onChange={(e) => onChange({ ...values, science2: e.target.value })}
            >
              <option value="">선택</option>
              {INQUIRY_SUBJECT_OPTIONS.filter((o) => o !== "").map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={loading || !values.science1.trim() || !values.science2.trim()}
          onClick={() => onAnalyze()}
        >
          {loading ? "분석 중…" : "조합 분석"}
        </Button>
      </CardContent>
    </Card>
  );
}

export { defaultValues as scienceComboDefaultValues };
