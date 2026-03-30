"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TrendChart } from "@/components/trend-analysis/TrendChart";
import { TrendFilter, type TrendFilterValue } from "@/components/trend-analysis/TrendFilter";
import type { CalcAdmissionTrendResult } from "@/lib/calculators/calcAdmissionTrend";

type ApiOk = {
  data: {
    records: { year: number; cutoffScore: number; competitionRatio: number }[];
    trend: CalcAdmissionTrendResult;
  };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

export type TrendAnalysisClientProps = {
  univOptions: string[];
  deptByUniv: Record<string, string[]>;
  initialFilter: TrendFilterValue;
};

export function TrendAnalysisClient({
  univOptions,
  deptByUniv,
  initialFilter,
}: TrendAnalysisClientProps) {
  const [filter, setFilter] = useState<TrendFilterValue>(initialFilter);

  const deptOptions = useMemo(() => {
    if (!filter.univName) return [];
    const list = deptByUniv[filter.univName] ?? [];
    return [...list].sort((a, b) => a.localeCompare(b, "ko"));
  }, [filter.univName, deptByUniv]);

  useEffect(() => {
    if (!filter.univName || deptOptions.length === 0) return;
    if (!filter.deptName || !deptOptions.includes(filter.deptName)) {
      setFilter((f) => ({ ...f, deptName: deptOptions[0]! }));
    }
  }, [filter.univName, filter.deptName, deptOptions]);

  const [records, setRecords] = useState<ApiOk["data"]["records"]>([]);
  const [trend, setTrend] = useState<CalcAdmissionTrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!filter.univName || !filter.deptName) {
      setRecords([]);
      setTrend(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({
        univName: filter.univName,
        deptName: filter.deptName,
        admissionType: filter.admissionType,
      });
      const res = await fetch(`/api/trend-analysis?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setRecords([]);
        setTrend(null);
        setError(body.error?.message ?? `요청 실패 (${res.status})`);
        return;
      }
      setRecords(body.data.records);
      setTrend(body.data.trend);
    } catch {
      setRecords([]);
      setTrend(null);
      setError("네트워크 오류로 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filter.univName, filter.deptName, filter.admissionType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <TrendFilter
        value={filter}
        onChange={setFilter}
        univOptions={univOptions}
        deptOptions={deptOptions}
        disabled={loading}
      />

      {error && (
        <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm">{error}</p>
      )}

      <TrendChart records={records} trend={trend} loading={loading} />
    </div>
  );
}
