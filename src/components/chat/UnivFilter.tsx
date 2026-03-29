"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";

const YEAR_OPTIONS = [
  { value: "", label: "연도 전체" },
  { value: "2027", label: "2027학년도" },
  { value: "2026", label: "2026학년도" },
] as const;

export type UnivFilterProps = {
  univName: string;
  year: string;
  onUnivNameChange: (v: string) => void;
  onYearChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
};

export function UnivFilter({
  univName,
  year,
  onUnivNameChange,
  onYearChange,
  disabled,
  className,
}: UnivFilterProps) {
  return (
    <div
      className={cn(
        "bg-background/95 flex flex-col gap-3 border-b border-border px-1 pb-3 sm:flex-row sm:items-end sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="chat-univ-filter" className="text-xs font-medium sm:text-sm">
          대학 (요강 스코프)
        </Label>
        <select
          id="chat-univ-filter"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-11 w-full min-h-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-h-9"
          value={univName}
          disabled={disabled}
          onChange={(e) => onUnivNameChange(e.target.value)}
        >
          <option value="">전체 (17교 전형계획 + 기타 청크)</option>
          {GUIDELINE_PLAN_UNIV_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full space-y-1.5 sm:max-w-[11rem]">
        <Label htmlFor="chat-year-filter" className="text-xs font-medium sm:text-sm">
          연도
        </Label>
        <select
          id="chat-year-filter"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-11 w-full min-h-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-h-9"
          value={year}
          disabled={disabled}
          onChange={(e) => onYearChange(e.target.value)}
        >
          {YEAR_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
