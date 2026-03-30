"use client";

import { Label } from "@/components/ui/label";

const ADMISSION_TYPES = ["학생부교과", "학생부종합", "정시"] as const;
const SIGNALS = [
  { value: "safe" as const, label: "안정" },
  { value: "moderate" as const, label: "적정" },
  { value: "challenge" as const, label: "도전" },
];
const REGIONS = [
  { value: "all" as const, label: "전국" },
  { value: "서울" as const, label: "서울" },
  { value: "수도권" as const, label: "수도권" },
  { value: "지방" as const, label: "지방" },
];

export type ExploreFilterState = {
  admissionTypes: Set<(typeof ADMISSION_TYPES)[number]>;
  signals: Set<"safe" | "moderate" | "challenge">;
  region: "all" | "서울" | "수도권" | "지방";
  suneungMin: "all" | "true" | "false";
  noInterview: "all" | "true" | "false";
  medShift: boolean;
};

export const defaultExploreFilterState = (): ExploreFilterState => ({
  admissionTypes: new Set(ADMISSION_TYPES),
  signals: new Set(["safe", "moderate", "challenge"]),
  region: "all",
  suneungMin: "all",
  noInterview: "all",
  medShift: false,
});

function toggleSet<T>(set: Set<T>, v: T, on: boolean): Set<T> {
  const n = new Set(set);
  if (on) n.add(v);
  else n.delete(v);
  return n;
}

export type ExploreFilterProps = {
  value: ExploreFilterState;
  onChange: (next: ExploreFilterState) => void;
  disabled?: boolean;
};

export function ExploreFilter({ value, onChange, disabled }: ExploreFilterProps) {
  const set = (patch: Partial<ExploreFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">필터</h2>
        <p className="text-muted-foreground text-sm">
          매뉴얼 §6 — 전형·신호등·지역·수능최저·면접 조건을 조합합니다.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-border pt-3">
        <input
          type="checkbox"
          checked={value.medShift}
          disabled={disabled}
          onChange={(e) => set({ medShift: e.target.checked })}
          className="border-input size-5 shrink-0 rounded border sm:size-4"
        />
        <span className="text-sm">의대 증원 보정 (컷에 med_shift_coeff 반영)</span>
      </label>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">전형 유형 (복수)</Label>
        <div className="flex flex-wrap gap-3">
          {ADMISSION_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.admissionTypes.has(t)}
                disabled={disabled}
                onChange={(e) =>
                  set({ admissionTypes: toggleSet(value.admissionTypes, t, e.target.checked) })
                }
                className="border-input size-4 rounded border"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">신호등 (복수)</Label>
        <div className="flex flex-wrap gap-3">
          {SIGNALS.map(({ value: v, label }) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.signals.has(v)}
                disabled={disabled}
                onChange={(e) =>
                  set({ signals: toggleSet(value.signals, v, e.target.checked) })
                }
                className="border-input size-4 rounded border"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">지역</Label>
        <select
          className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
          disabled={disabled}
          value={value.region}
          onChange={(e) =>
            set({ region: e.target.value as ExploreFilterState["region"] })
          }
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">수능최저 (수시 기준)</Label>
          <select
            className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
            disabled={disabled}
            value={value.suneungMin}
            onChange={(e) =>
              set({ suneungMin: e.target.value as ExploreFilterState["suneungMin"] })
            }
          >
            <option value="all">모두</option>
            <option value="true">없음</option>
            <option value="false">있음</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">면접</Label>
          <select
            className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
            disabled={disabled}
            value={value.noInterview}
            onChange={(e) =>
              set({ noInterview: e.target.value as ExploreFilterState["noInterview"] })
            }
          >
            <option value="all">모두</option>
            <option value="true">없음</option>
            <option value="false">있음</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function exploreFiltersToSearchParams(
  studentId: string,
  f: ExploreFilterState,
): URLSearchParams {
  const sp = new URLSearchParams({ studentId });
  if (f.medShift) sp.set("medShift", "1");
  if (f.admissionTypes.size > 0 && f.admissionTypes.size < ADMISSION_TYPES.length) {
    sp.set("admissionType", [...f.admissionTypes].join(","));
  }
  if (f.signals.size > 0 && f.signals.size < SIGNALS.length) {
    sp.set("signal", [...f.signals].join(","));
  }
  if (f.region !== "all") sp.set("region", f.region);
  if (f.suneungMin !== "all") sp.set("suneungMin", f.suneungMin);
  if (f.noInterview !== "all") sp.set("noInterview", f.noInterview);
  return sp;
}
