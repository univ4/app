"use client";

import { useCallback, useEffect, useState } from "react";

import { NulsulCalculator } from "@/components/nulsul/NulsulCalculator";
import {
  NulsulCompareTable,
  type NulsulCompareRow,
} from "@/components/nulsul/NulsulCompareTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { NulsulAdmissionItem } from "@/lib/nulsul/types";

type ApiOk = {
  data: {
    items: NulsulAdmissionItem[];
    meta: { admission_year: number; row_count: number };
  };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

export function NulsulDashboardClient({ defaultYear }: { defaultYear: number }) {
  const [admissionYear, setAdmissionYear] = useState(defaultYear);
  const [items, setItems] = useState<NulsulAdmissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareRows, setCompareRows] = useState<NulsulCompareRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ admissionYear: String(admissionYear) });
      const res = await fetch(`/api/nulsul?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setItems([]);
        setError(body.error?.message ?? `요청 실패 (${res.status})`);
        return;
      }
      setItems(body.data.items);
    } catch {
      setItems([]);
      setError("네트워크 오류로 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [admissionYear]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">입시 연도</CardTitle>
          <CardDescription>admission_records 조회 연도입니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="nulsul-year">연도</Label>
            <select
              id="nulsul-year"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={admissionYear}
              onChange={(e) => setAdmissionYear(Number(e.target.value))}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {loading && <p className="text-muted-foreground text-sm">불러오는 중…</p>}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>

      <NulsulCalculator
        items={items}
        admissionYear={admissionYear}
        onAddCompare={(row) => setCompareRows((prev) => [...prev, row])}
      />

      <Card>
        <CardHeader>
          <CardTitle>여러 대학 비교</CardTitle>
          <CardDescription>실질·명목·차이(명목−실질)를 한 표에서 비교합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <NulsulCompareTable
            rows={compareRows}
            onRemove={(key) => setCompareRows((prev) => prev.filter((r) => r.rowKey !== key))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
