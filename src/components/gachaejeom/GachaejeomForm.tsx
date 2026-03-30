"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClass =
  "min-h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:min-h-8 md:text-sm dark:bg-input/30";

export type GachaejeomFormPayload = {
  korean: { rawScore: number; subject: string };
  math: { rawScore: number; subject: string };
  english: { grade: number };
  science1: { rawScore: number; subjectName: string };
  science2: { rawScore: number; subjectName: string };
};

type Props = {
  onSubmit: (payload: GachaejeomFormPayload) => Promise<void>;
  disabled?: boolean;
};

const KOREAN_OPTIONS = [
  { value: "언어와매체", label: "언어와매체" },
  { value: "화법과작문", label: "화법과작문" },
] as const;

const MATH_OPTIONS = [
  { value: "미적분", label: "미적분" },
  { value: "기하", label: "기하" },
  { value: "확률과통계", label: "확률과통계" },
] as const;

export function GachaejeomForm({ onSubmit, disabled }: Props) {
  const [koreanRaw, setKoreanRaw] = useState("63");
  const [koreanSubject, setKoreanSubject] = useState<string>(KOREAN_OPTIONS[0].value);
  const [mathRaw, setMathRaw] = useState("68");
  const [mathSubject, setMathSubject] = useState<string>(MATH_OPTIONS[0].value);
  const [englishGrade, setEnglishGrade] = useState("2");
  const [sci1Raw, setSci1Raw] = useState("50");
  const [sci1Name, setSci1Name] = useState("생명과학Ⅰ");
  const [sci2Raw, setSci2Raw] = useState("50");
  const [sci2Name, setSci2Name] = useState("지구과학Ⅰ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: GachaejeomFormPayload = {
      korean: { rawScore: Number(koreanRaw), subject: koreanSubject },
      math: { rawScore: Number(mathRaw), subject: mathSubject },
      english: { grade: Number(englishGrade) },
      science1: { rawScore: Number(sci1Raw), subjectName: sci1Name },
      science2: { rawScore: Number(sci2Raw), subjectName: sci2Name },
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gach-korean-raw">국어 원점수 (0~150)</Label>
          <Input
            id="gach-korean-raw"
            type="number"
            min={0}
            max={150}
            step={0.5}
            value={koreanRaw}
            onChange={(e) => setKoreanRaw(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gach-korean-subj">국어 선택과목</Label>
          <select
            id="gach-korean-subj"
            className={cn(selectClass)}
            value={koreanSubject}
            onChange={(e) => setKoreanSubject(e.target.value)}
            disabled={disabled}
          >
            {KOREAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gach-math-raw">수학 원점수 (0~150)</Label>
          <Input
            id="gach-math-raw"
            type="number"
            min={0}
            max={150}
            step={0.5}
            value={mathRaw}
            onChange={(e) => setMathRaw(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gach-math-subj">수학 선택과목</Label>
          <select
            id="gach-math-subj"
            className={cn(selectClass)}
            value={mathSubject}
            onChange={(e) => setMathSubject(e.target.value)}
            disabled={disabled}
          >
            {MATH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gach-eng">영어 등급 (1~9)</Label>
          <Input
            id="gach-eng"
            type="number"
            min={1}
            max={9}
            step={1}
            value={englishGrade}
            onChange={(e) => setEnglishGrade(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gach-s1-raw">탐구1 원점수 (0~75)</Label>
          <Input
            id="gach-s1-raw"
            type="number"
            min={0}
            max={75}
            step={0.5}
            value={sci1Raw}
            onChange={(e) => setSci1Raw(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gach-s1-name">탐구1 과목명</Label>
          <Input
            id="gach-s1-name"
            value={sci1Name}
            onChange={(e) => setSci1Name(e.target.value)}
            required
            disabled={disabled}
            placeholder="예: 생명과학Ⅰ"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gach-s2-raw">탐구2 원점수 (0~75)</Label>
          <Input
            id="gach-s2-raw"
            type="number"
            min={0}
            max={75}
            step={0.5}
            value={sci2Raw}
            onChange={(e) => setSci2Raw(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gach-s2-name">탐구2 과목명 (과탐Ⅱ 포함 시 ‘Ⅱ’ 표기)</Label>
          <Input
            id="gach-s2-name"
            value={sci2Name}
            onChange={(e) => setSci2Name(e.target.value)}
            required
            disabled={disabled}
            placeholder="예: 화학Ⅱ"
          />
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={disabled}>
        계산하기
      </Button>
    </form>
  );
}
