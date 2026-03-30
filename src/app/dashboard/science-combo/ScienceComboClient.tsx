"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import {
  ScienceComboForm,
  scienceComboDefaultValues,
  type ScienceComboFormValues,
} from "@/components/science-combo/ScienceComboForm";
import { ScienceComboResult } from "@/components/science-combo/ScienceComboResult";
import type { CalcScienceComboSimulatorResult } from "@/lib/calculators/calcScienceComboSimulator";

type ApiOk = { data: { result: CalcScienceComboSimulatorResult }; error: null };
type ApiErr = { data: null; error: { code: string; message: string } };

export function ScienceComboClient() {
  const [values, setValues] = useState<ScienceComboFormValues>(scienceComboDefaultValues);
  const [result, setResult] = useState<CalcScienceComboSimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/science-combo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          science1: values.science1.trim(),
          science2: values.science2.trim(),
        }),
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setResult(null);
        setError(body.error?.message ?? "분석에 실패했습니다.");
        return;
      }
      setResult(body.data.result);
    } catch {
      setResult(null);
      setError("네트워크 오류로 분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [values.science1, values.science2]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">과탐 조합 시뮬레이터</h1>
          <p className="text-muted-foreground text-sm">
            탐구1·탐구2 선택에 따른 과탐Ⅱ 가산 적용 가능 대학 비교 (자연계열 정시 반영 규칙)
          </p>
        </div>
        <Link href="/dashboard" className="text-primary text-sm underline">
          대시보드로
        </Link>
      </div>

      <ScienceComboForm
        values={values}
        onChange={setValues}
        onAnalyze={onAnalyze}
        loading={loading}
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <ScienceComboResult result={result} />
    </div>
  );
}
