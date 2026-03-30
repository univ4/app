"use client";

import { useCallback, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GachaejeomApiSuccess } from "@/lib/gachaejeom/gachaejeomApiTypes";

import { GachaejeomForm, type GachaejeomFormPayload } from "./GachaejeomForm";
import { GachaejeomResult } from "./GachaejeomResult";

export function GachaejeomView() {
  const [result, setResult] = useState<GachaejeomApiSuccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(async (payload: GachaejeomFormPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gachaejeom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as {
        data: GachaejeomApiSuccess | null;
        error: { code: string; message: string } | null;
      };
      if (!res.ok || body.error) {
        setResult(null);
        setError(body.error?.message ?? "요청에 실패했습니다.");
        return;
      }
      if (body.data) setResult(body.data);
    } catch {
      setResult(null);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>가채점 입력</CardTitle>
          <CardDescription>
            원점수를 입력하면 추정 표준점수·백분위와 18개 대학 정시 환산·신호등을 계산합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GachaejeomForm onSubmit={handleCalculate} disabled={loading} />
          {error ? <p className="text-destructive mt-4 text-sm">{error}</p> : null}
        </CardContent>
      </Card>

      <GachaejeomResult data={result} />
    </div>
  );
}
