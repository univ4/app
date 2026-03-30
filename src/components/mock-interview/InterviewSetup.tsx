"use client";

import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";
import type { InterviewType } from "@/types/mockInterview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INTERVIEW_TYPES: InterviewType[] = ["서류기반", "MMI", "교직인적성"];

type InterviewSetupProps = {
  targetUniv: string;
  onTargetUnivChange: (v: string) => void;
  interviewType: InterviewType;
  onInterviewTypeChange: (v: InterviewType) => void;
  loading: boolean;
  onGenerate: () => void;
};

export function InterviewSetup({
  targetUniv,
  onTargetUnivChange,
  interviewType,
  onInterviewTypeChange,
  loading,
  onGenerate,
}: InterviewSetupProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mock-interview-univ">목표 대학 (요강 18교)</Label>
          <select
            id="mock-interview-univ"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={targetUniv}
            onChange={(e) => onTargetUnivChange(e.target.value)}
            disabled={loading}
            aria-label="목표 대학 선택"
          >
            <option value="">대학 선택</option>
            {GUIDELINE_PLAN_UNIV_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mock-interview-type">면접 유형</Label>
          <select
            id="mock-interview-type"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={interviewType}
            onChange={(e) => onInterviewTypeChange(e.target.value as InterviewType)}
            disabled={loading}
            aria-label="면접 유형"
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        type="button"
        onClick={() => onGenerate()}
        disabled={loading || targetUniv.trim().length === 0}
        className="w-full sm:w-auto"
      >
        {loading ? "질문 생성 중…" : "질문 생성"}
      </Button>
    </div>
  );
}
