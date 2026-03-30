"use client";

import { useCallback, useEffect, useState } from "react";

import {
  defaultExploreFilterState,
  ExploreFilter,
  exploreFiltersToSearchParams,
  type ExploreFilterState,
} from "@/components/explore/ExploreFilter";
import { ExploreTable } from "@/components/explore/ExploreTable";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

type ApiOk = {
  data: {
    items: SignalScanRow[];
    meta: { total: number; duration_ms: number };
  };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

export function ExploreClient({ studentId }: { studentId: string }) {
  const [filters, setFilters] = useState<ExploreFilterState>(defaultExploreFilterState);
  const [rows, setRows] = useState<SignalScanRow[]>([]);
  const [total, setTotal] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (filters.admissionTypes.size === 0 || filters.signals.size === 0) {
      setRows([]);
      setTotal(0);
      setDurationMs(null);
      setError("전형 유형과 신호등을 각각 한 가지 이상 선택해 주세요.");
      setLoading(false);
      return;
    }
    try {
      const sp = exploreFiltersToSearchParams(studentId, filters);
      const res = await fetch(`/api/explore?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setRows([]);
        setTotal(0);
        setDurationMs(null);
        setError(body.error?.message ?? `요청 실패 (${res.status})`);
        return;
      }
      setRows(body.data.items);
      setTotal(body.data.meta.total);
      setDurationMs(body.data.meta.duration_ms);
    } catch {
      setRows([]);
      setTotal(0);
      setDurationMs(null);
      setError("네트워크 오류로 결과를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [studentId, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <ExploreFilter value={filters} onChange={setFilters} disabled={loading} />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <ExploreTable
        rows={rows}
        loading={loading}
        durationMs={durationMs}
        total={total}
      />
    </div>
  );
}
