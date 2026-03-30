"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { GunAnalysisResult, type JeongsiGunStrategyPayload } from "@/components/jeongsi-gun/GunAnalysisResult";
import { GunSelector } from "@/components/jeongsi-gun/GunSelector";
import { Button } from "@/components/ui/button";
import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

type SignalsApiOk = {
  data: { items: SignalScanRow[]; meta: Record<string, unknown> } | null;
  error: { code: string; message?: string } | null;
};

function firstJeongsiSignal(
  items: SignalScanRow[],
  univ: string,
): AdmissionSignalTier | undefined {
  const trimmed = univ.trim();
  if (!trimmed) return undefined;
  const rows = items.filter(
    (r) => r.university_name === trimmed && r.admission_type === "정시",
  );
  if (rows.length === 0) return undefined;
  rows.sort((a, b) => a.id - b.id);
  return rows[0]!.signal;
}

export type JeongsiGunViewProps = {
  universities: string[];
};

export function JeongsiGunView({ universities }: JeongsiGunViewProps) {
  const [gaUniv, setGaUniv] = useState("");
  const [naUniv, setNaUniv] = useState("");
  const [daUniv, setDaUniv] = useState("");

  const [signalItems, setSignalItems] = useState<SignalScanRow[]>([]);
  const [signalsError, setSignalsError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<JeongsiGunStrategyPayload | null>(null);
  const [ragSummary, setRagSummary] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/signals");
        const body = (await res.json()) as SignalsApiOk;
        if (cancelled) return;
        if (!res.ok || body.error) {
          setSignalsError(body.error?.message ?? "신호등을 불러오지 못했습니다.");
          setSignalItems([]);
          return;
        }
        setSignalsError(null);
        setSignalItems(body.data?.items ?? []);
      } catch {
        if (!cancelled) {
          setSignalsError("신호등 요청에 실패했습니다.");
          setSignalItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signalByUniv = useMemo(() => {
    const m: Partial<Record<string, AdmissionSignalTier>> = {};
    for (const u of [gaUniv, naUniv, daUniv]) {
      if (!u) continue;
      const s = firstJeongsiSignal(signalItems, u);
      if (s) m[u] = s;
    }
    return m;
  }, [signalItems, gaUniv, naUniv, daUniv]);

  const runAnalyze = useCallback(async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    setStrategy(null);
    setRagSummary(null);
    try {
      const res = await fetch("/api/jeongsi-gun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaUniv, naUniv, daUniv }),
      });
      const body = (await res.json()) as {
        data: { strategy: JeongsiGunStrategyPayload; ragSummary: string } | null;
        error: { code: string; message?: string } | null;
      };
      if (!res.ok || body.error) {
        setAnalyzeError(body.error?.message ?? "분석에 실패했습니다.");
        return;
      }
      if (body.data?.strategy) {
        setStrategy(body.data.strategy);
        setRagSummary(body.data.ragSummary ?? null);
      }
    } catch {
      setAnalyzeError("네트워크 오류로 분석에 실패했습니다.");
    } finally {
      setAnalyzeLoading(false);
    }
  }, [gaUniv, naUniv, daUniv]);

  return (
    <div className="space-y-6">
      {signalsError ? (
        <p className="text-destructive text-sm" role="alert">
          {signalsError}
        </p>
      ) : null}

      <GunSelector
        universities={universities}
        gaUniv={gaUniv}
        naUniv={naUniv}
        daUniv={daUniv}
        onGaChange={setGaUniv}
        onNaChange={setNaUniv}
        onDaChange={setDaUniv}
        signalByUniv={signalByUniv}
      />

      <Button type="button" onClick={() => void runAnalyze()} disabled={analyzeLoading}>
        {analyzeLoading ? "분석 중…" : "분석 실행"}
      </Button>

      <GunAnalysisResult
        strategy={strategy}
        ragSummary={ragSummary}
        loading={analyzeLoading}
        error={analyzeError}
      />
    </div>
  );
}
