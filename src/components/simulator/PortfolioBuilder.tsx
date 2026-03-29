"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

export type SimulatorPortfolioCard = {
  clientKey: string;
  university: string;
  department: string;
  admissionType: string;
  signal: AdmissionSignalTier;
  hasSuneungMinimum: boolean;
  admissionRecordId?: number;
};

type DbAdmissionSearchRow = {
  id: number;
  univ_name: string;
  dept_name: string;
  admission_type: string;
  year: number;
};

function signalLabel(s: AdmissionSignalTier) {
  if (s === "safe") return "안정";
  if (s === "moderate") return "적정";
  return "도전";
}

function signalBadgeVariant(s: AdmissionSignalTier): "outline" | "secondary" | "destructive" {
  if (s === "safe") return "outline";
  if (s === "moderate") return "secondary";
  return "destructive";
}

type PortfolioBuilderProps = {
  cards: SimulatorPortfolioCard[];
  onCardsChange: (next: SimulatorPortfolioCard[]) => void;
  signalRows: SignalScanRow[];
  admissionYear: number;
};

export function PortfolioBuilder({
  cards,
  onCardsChange,
  signalRows,
  admissionYear,
}: PortfolioBuilderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DbAdmissionSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [manualUniv, setManualUniv] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [manualType, setManualType] = useState("학생부교과");
  const [manualSignal, setManualSignal] = useState<AdmissionSignalTier>("moderate");
  const [manualMin, setManualMin] = useState(false);

  const rowById = useMemo(() => new Map(signalRows.map((r) => [r.id, r])), [signalRows]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const pattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const { data, error } = await supabase
        .from("admission_records")
        .select("id, univ_name, dept_name, admission_type, year")
        .eq("year", admissionYear)
        .neq("admission_type", "정시")
        .or(`univ_name.ilike.${pattern},dept_name.ilike.${pattern}`)
        .limit(25);
      if (error) {
        setResults([]);
        return;
      }
      setResults((data ?? []) as DbAdmissionSearchRow[]);
    } finally {
      setSearching(false);
    }
  }, [admissionYear, query, supabase]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch();
    }, 280);
    return () => window.clearTimeout(t);
  }, [runSearch]);

  const resolveSuneungMinimum = useCallback(
    async (univ: string, admissionType: string): Promise<boolean> => {
      const { data } = await supabase
        .from("susi_gpa_rules")
        .select("suneung_minimum")
        .eq("university_name", univ)
        .eq("admission_type", admissionType)
        .eq("admission_year", admissionYear)
        .maybeSingle();
      const raw = data?.suneung_minimum;
      if (raw == null) return false;
      if (typeof raw === "object" && raw !== null && Object.keys(raw as object).length === 0) {
        return false;
      }
      return true;
    },
    [admissionYear, supabase],
  );

  const addFromDbRow = useCallback(
    async (row: DbAdmissionSearchRow) => {
      if (cards.length >= 6) return;
      const sigRow = rowById.get(row.id);
      const signal = sigRow?.signal ?? "moderate";
      const hasSuneungMinimum = await resolveSuneungMinimum(row.univ_name, row.admission_type);
      const next: SimulatorPortfolioCard = {
        clientKey: crypto.randomUUID(),
        university: row.univ_name,
        department: row.dept_name,
        admissionType: row.admission_type,
        signal,
        hasSuneungMinimum,
        admissionRecordId: row.id,
      };
      onCardsChange([...cards, next]);
    },
    [cards, onCardsChange, resolveSuneungMinimum, rowById],
  );

  const addManual = useCallback(() => {
    if (cards.length >= 6) return;
    const u = manualUniv.trim();
    const d = manualDept.trim();
    if (!u || !d) return;
    const sigRow = signalRows.find(
      (r) =>
        r.university_name === u &&
        r.admission_name === d &&
        r.admission_type === manualType,
    );
    const next: SimulatorPortfolioCard = {
      clientKey: crypto.randomUUID(),
      university: u,
      department: d,
      admissionType: manualType,
      signal: sigRow?.signal ?? manualSignal,
      hasSuneungMinimum: manualMin,
    };
    onCardsChange([...cards, next]);
    setManualUniv("");
    setManualDept("");
  }, [cards, manualDept, manualMin, manualSignal, manualType, manualUniv, onCardsChange, signalRows]);

  const removeAt = useCallback(
    (clientKey: string) => {
      onCardsChange(cards.filter((c) => c.clientKey !== clientKey));
    },
    [cards, onCardsChange],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>포트폴리오 구성 (최대 6장)</CardTitle>
        <CardDescription>
          입결 데이터에서 검색해 추가하거나, 논술 등 직접 입력하세요. 신호등은{" "}
          <span className="font-medium text-foreground">합격 신호등</span> 스캔 결과와 동일한 ID 기준으로
          연동됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="sim-search">대학·학과 검색 ({admissionYear}학년도 수시 행만)</Label>
          <Input
            id="sim-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 서강대, 자연계열…"
            autoComplete="off"
          />
          {searching ? (
            <p className="text-muted-foreground text-xs">검색 중…</p>
          ) : results.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-border text-sm">
              {results.map((row) => (
                <li key={row.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/60"
                    disabled={cards.length >= 6}
                    onClick={() => void addFromDbRow(row)}
                  >
                    <span className="font-medium">
                      {row.univ_name} · {row.dept_name}
                    </span>
                    <span className="text-muted-foreground text-xs">{row.admission_type}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length > 0 ? (
            <p className="text-muted-foreground text-xs">결과 없음</p>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <p className="text-sm font-medium">직접 입력 (논술전형 등)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>대학</Label>
              <Input value={manualUniv} onChange={(e) => setManualUniv(e.target.value)} placeholder="대학명" />
            </div>
            <div className="space-y-1">
              <Label>모집단위·전형명</Label>
              <Input value={manualDept} onChange={(e) => setManualDept(e.target.value)} placeholder="학과/전형" />
            </div>
            <div className="space-y-1">
              <Label>전형 유형</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
              >
                <option value="학생부교과">학생부교과</option>
                <option value="학생부종합">학생부종합</option>
                <option value="논술전형">논술전형</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>신호등 (신호등 스캔에 없을 때)</Label>
              <select
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={manualSignal}
                onChange={(e) => setManualSignal(e.target.value as AdmissionSignalTier)}
              >
                <option value="safe">안정</option>
                <option value="moderate">적정</option>
                <option value="challenge">도전</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manualMin}
              onChange={(e) => setManualMin(e.target.checked)}
              className="size-4 rounded border border-input"
            />
            수능최저 반영 전형
          </label>
          <Button type="button" variant="secondary" disabled={cards.length >= 6} onClick={addManual}>
            직접 입력 카드 추가
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">현재 카드 ({cards.length}/6)</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {Array.from({ length: 6 }).map((_, idx) => {
              const c = cards[idx];
              if (!c) {
                return (
                  <li key={`empty-${idx}`} className="text-muted-foreground">
                    비어 있음 — 위에서 검색 또는 직접 입력으로 추가
                  </li>
                );
              }
              return (
                <li key={c.clientKey} className="rounded-md border border-border bg-card p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium">
                        {c.university} {c.department}
                      </div>
                      <div className="text-muted-foreground text-xs">{c.admissionType}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={signalBadgeVariant(c.signal)}>{signalLabel(c.signal)}</Badge>
                        {c.hasSuneungMinimum ? (
                          <Badge variant="outline">수능최저</Badge>
                        ) : null}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeAt(c.clientKey)}>
                      삭제
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
