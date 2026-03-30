"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import {
  buildNsuStrategyPayload,
  NsuStrategyForm,
  nsuStrategyFormDefaults,
  type NsuStrategyFormValues,
} from "@/components/nsu-strategy/NsuStrategyForm";
import { NsuStrategyResult } from "@/components/nsu-strategy/NsuStrategyResult";
import type { CalcNsuStrategyResult } from "@/lib/calculators/calcNsuStrategy";

type ApiOk = { data: { strategy: CalcNsuStrategyResult }; error: null };
type ApiErr = { data: null; error: { code: string; message: string } };

export function NsuStrategyClient() {
  const [values, setValues] = useState<NsuStrategyFormValues>(nsuStrategyFormDefaults);
  const [result, setResult] = useState<CalcNsuStrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/nsu-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildNsuStrategyPayload(values)),
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setResult(null);
        setError(body.error?.message ?? "전략을 불러오지 못했습니다.");
        return;
      }
      setResult(body.data.strategy);
    } catch {
      setResult(null);
      setError("네트워크 오류로 전략을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [values]);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm">
        <p className="text-foreground font-medium">재수생·N수생 안내</p>
        <p className="text-muted-foreground mt-1">
          학생부 반영이 제한되거나 불리한 전형이 많아, 정시·수시 균형은 개인별로 크게 달라집니다. 결과는{" "}
          <code className="rounded bg-muted px-1">admission_records</code> 기반 신호등·탐색과 함께 참고하세요.
        </p>
        <Link href="/dashboard/signals" className="text-primary mt-3 inline-block text-sm underline">
          합격 신호등으로 이동
        </Link>
      </div>

      <NsuStrategyForm values={values} onChange={setValues} onSubmit={onSubmit} loading={loading} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <NsuStrategyResult data={result} />
    </div>
  );
}
