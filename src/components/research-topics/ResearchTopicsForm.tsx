"use client";

import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";

export type ResearchTopicsFormProps = {
  targetUniv: string;
  onTargetUnivChange: (value: string) => void;
  targetDept: string;
  onTargetDeptChange: (value: string) => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  loading: boolean;
  onStart: () => void;
};

export function ResearchTopicsForm({
  targetUniv,
  onTargetUnivChange,
  targetDept,
  onTargetDeptChange,
  subject,
  onSubjectChange,
  loading,
  onStart,
}: ResearchTopicsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">탐구 주제 설정</CardTitle>
        <CardDescription>
          적재된 세특 청크(metadata.section=세특)와 목표 대학 전형계획 청크를 근거로 추천합니다. 문장
          대필은 제공하지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2 sm:col-span-2">
            <Label htmlFor="rt-target-univ">목표 대학</Label>
            <select
              id="rt-target-univ"
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
            <Label htmlFor="rt-target-dept">목표 학과 (선택)</Label>
            <Input
              id="rt-target-dept"
              placeholder="예: 전자전기공학부"
              value={targetDept}
              onChange={(e) => onTargetDeptChange(e.target.value)}
              disabled={loading}
              maxLength={200}
              aria-label="목표 학과"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="rt-subject">연계 교과목 (선택)</Label>
            <Input
              id="rt-subject"
              placeholder="예: 물리학Ⅱ"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={loading}
              maxLength={200}
              aria-label="연계 교과목"
            />
          </div>
        </div>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => onStart()}
          disabled={loading || targetUniv.trim().length === 0}
        >
          <FlaskConical className="mr-2 size-4" aria-hidden />
          {loading ? "추천 생성 중…" : "탐구 주제 추천받기"}
        </Button>
      </CardContent>
    </Card>
  );
}
