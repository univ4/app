"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcRealCompetitionRate } from "@/lib/calculators/calcRealCompetitionRate";
import type { NulsulAdmissionItem } from "@/lib/nulsul/types";

import type { NulsulCompareRow } from "./NulsulCompareTable";

function parsePositiveNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parsePercentToRate(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n / 100;
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

export function NulsulCalculator({
  items,
  admissionYear,
  onAddCompare,
}: {
  items: NulsulAdmissionItem[];
  admissionYear: number;
  onAddCompare: (row: NulsulCompareRow) => void;
}) {
  const options = useMemo(
    () =>
      items.map((it) => ({
        it,
        label: `${it.univ_name} — ${it.dept_name}`,
        value: String(it.id),
      })),
    [items],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [nominalOverride, setNominalOverride] = useState("");
  const [satisfactionPct, setSatisfactionPct] = useState("50");
  const [absencePct, setAbsencePct] = useState("10");

  const selected = items.find((i) => String(i.id) === selectedId);

  const nominalFromRecord =
    selected?.competition_ratio != null && Number.isFinite(Number(selected.competition_ratio))
      ? Number(selected.competition_ratio)
      : null;

  const nominalEffective =
    nominalOverride.trim() !== ""
      ? parsePositiveNumber(nominalOverride)
      : nominalFromRecord;

  const suneungRate = parsePercentToRate(satisfactionPct);
  const absenceRate = parsePercentToRate(absencePct);

  const { preview, calcError } = useMemo(() => {
    if (
      !selected ||
      nominalEffective == null ||
      suneungRate == null ||
      absenceRate == null
    ) {
      return { preview: null as ReturnType<typeof calcRealCompetitionRate> | null, calcError: null as string | null };
    }
    try {
      return {
        preview: calcRealCompetitionRate({
          nominalRate: nominalEffective,
          suneungMinimumRate: suneungRate,
          absenceRate,
        }),
        calcError: null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "계산 오류";
      return { preview: null, calcError: msg };
    }
  }, [selected, nominalEffective, suneungRate, absenceRate]);

  const canAdd =
    selected &&
    nominalEffective != null &&
    suneungRate != null &&
    absenceRate != null &&
    preview != null;

  function handleAdd() {
    if (!canAdd || !selected || preview == null) return;
    const rowKey = `${selected.id}-${Date.now()}`;
    onAddCompare({
      rowKey,
      univ_name: selected.univ_name,
      dept_name: selected.dept_name,
      year: admissionYear,
      nominalRate: preview.nominalRate,
      suneungMinimumRate: suneungRate!,
      absenceRate: absenceRate!,
      realRate: preview.realRate,
      diffRate: preview.diffRate,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>실질 경쟁률 계산</CardTitle>
        <CardDescription>
          입시 연도 {admissionYear} · admission_records 논술전형 명목 경쟁률과 수능최저 충족률·결시율을 반영합니다
          (PRD P1-3).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nulsul-pick">대학 / 논술 전형</Label>
          <select
            id="nulsul-pick"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setNominalOverride("");
            }}
          >
            <option value="">선택…</option>
            {options.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm">
              해당 연도 논술전형 데이터가 없습니다. DB 적재·연도를 확인하거나 ingest에 논술전형 행을 포함해 주세요.
            </p>
          )}
        </div>

        {selected && (
          <>
            <div className="space-y-2">
              <Label htmlFor="nulsul-nominal">명목 경쟁률</Label>
              <Input
                id="nulsul-nominal"
                inputMode="decimal"
                placeholder={
                  nominalFromRecord != null
                    ? `DB값 ${nominalFromRecord} (수정 가능)`
                    : "DB에 없음 — 직접 입력"
                }
                value={nominalOverride}
                onChange={(e) => setNominalOverride(e.target.value)}
              />
              {nominalFromRecord != null && nominalOverride.trim() === "" && (
                <p className="text-muted-foreground text-xs">
                  적재값: <span className="text-foreground font-medium">{nominalFromRecord}</span>
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nulsul-sat">수능최저 충족률 (%)</Label>
                <Input
                  id="nulsul-sat"
                  inputMode="decimal"
                  value={satisfactionPct}
                  onChange={(e) => setSatisfactionPct(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">수능최저가 없으면 100%에 가깝게 두면 됩니다.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nulsul-abs">결시율 (%)</Label>
                <Input
                  id="nulsul-abs"
                  inputMode="decimal"
                  value={absencePct}
                  onChange={(e) => setAbsencePct(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">기본 10% (PRD 가정).</p>
              </div>
            </div>

            {calcError && <p className="text-destructive text-sm">{calcError}</p>}

            {preview && (
              <div className="bg-muted/40 space-y-1 rounded-md border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">실질 경쟁률:</span>{" "}
                  <span className="font-semibold">{fmt(preview.realRate)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">명목 경쟁률:</span>{" "}
                  <span className="font-medium">{fmt(preview.nominalRate)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">차이(명목 − 실질):</span>{" "}
                  <span className="font-medium">{fmt(preview.diffRate)}</span>
                </p>
              </div>
            )}

            <Button type="button" onClick={handleAdd} disabled={!canAdd}>
              비교 표에 추가
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
