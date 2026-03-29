"use client";

import { useCallback, useEffect, useState } from "react";

import { SignalTable } from "@/components/signals/SignalTable";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

type ApiOk = {
  data: {
    items: SignalScanRow[];
    meta: {
      admission_year: number;
      row_count: number;
      unique_universities: number;
      duration_ms: number;
      med_shift_enabled: boolean;
      has_mock_exam: boolean;
      has_school_gpa: boolean;
    };
  };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

export function SignalsClient({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<SignalScanRow[]>([]);
  const [meta, setMeta] = useState<ApiOk["data"]["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [medShift, setMedShift] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({
        studentId,
        medShift: medShift ? "1" : "0",
      });
      const res = await fetch(`/api/signals?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setRows([]);
        setMeta(null);
        setError(body.error?.message ?? `요청 실패 (${res.status})`);
        return;
      }
      setRows(body.data.items);
      setMeta(body.data.meta);
    } catch {
      setRows([]);
      setMeta(null);
      setError("네트워크 오류로 신호등을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [studentId, medShift]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SignalTable
      rows={rows}
      loading={loading}
      error={error}
      meta={meta}
      medShiftEnabled={medShift}
      onMedShiftChange={setMedShift}
      onScan={load}
    />
  );
}
