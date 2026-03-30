"use client";

import { Label } from "@/components/ui/label";

const ADMISSION_TYPES = ["학생부교과", "학생부종합", "논술전형", "정시"] as const;

export type TrendFilterValue = {
  univName: string;
  deptName: string;
  admissionType: (typeof ADMISSION_TYPES)[number];
};

export type TrendFilterProps = {
  value: TrendFilterValue;
  onChange: (next: TrendFilterValue) => void;
  univOptions: string[];
  deptOptions: string[];
  disabled?: boolean;
};

const selectClass =
  "border-input bg-background text-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";

export function TrendFilter({
  value,
  onChange,
  univOptions,
  deptOptions,
  disabled,
}: TrendFilterProps) {
  const set = (patch: Partial<TrendFilterValue>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">조건 선택</h2>
        <p className="text-muted-foreground text-sm">
          대학·모집단위(계열)·전형을 고르면 연도별 컷 추이를 불러옵니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="trend-univ" className="text-xs text-muted-foreground">
            대학명
          </Label>
          <select
            id="trend-univ"
            className={selectClass}
            disabled={disabled}
            value={value.univName}
            onChange={(e) => {
              const univName = e.target.value;
              set({ univName, deptName: "" });
            }}
          >
            <option value="">대학 선택</option>
            {univOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trend-dept" className="text-xs text-muted-foreground">
            모집단위 (계열)
          </Label>
          <select
            id="trend-dept"
            className={selectClass}
            disabled={disabled || deptOptions.length === 0}
            value={value.deptName}
            onChange={(e) => set({ deptName: e.target.value })}
          >
            <option value="">모집단위 선택</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trend-type" className="text-xs text-muted-foreground">
            전형
          </Label>
          <select
            id="trend-type"
            className={selectClass}
            disabled={disabled}
            value={value.admissionType}
            onChange={(e) =>
              set({ admissionType: e.target.value as TrendFilterValue["admissionType"] })
            }
          >
            {ADMISSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
