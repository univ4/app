"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortfolioBuilder, type SimulatorPortfolioCard } from "@/components/simulator/PortfolioBuilder";
import { PortfolioSummary } from "@/components/simulator/PortfolioSummary";
import { Button } from "@/components/ui/button";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

type PortfolioApiRow = {
  id: string;
  student_id: string;
  cards: unknown;
  created_at: string;
};

type GetOk = {
  data: { portfolio: PortfolioApiRow | null };
  error: null;
};

type PostOk = {
  data: { portfolio: PortfolioApiRow };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function parseStoredCards(raw: unknown): Omit<SimulatorPortfolioCard, "clientKey">[] {
  if (!Array.isArray(raw)) return [];
  const out: Omit<SimulatorPortfolioCard, "clientKey">[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const university = typeof item.university === "string" ? item.university : "";
    const department = typeof item.department === "string" ? item.department : "";
    const admissionType = typeof item.admissionType === "string" ? item.admissionType : "";
    const signal =
      item.signal === "safe" || item.signal === "moderate" || item.signal === "challenge"
        ? item.signal
        : "moderate";
    const hasSuneungMinimum = Boolean(item.hasSuneungMinimum);
    const admissionRecordId =
      typeof item.admissionRecordId === "number" && Number.isFinite(item.admissionRecordId)
        ? item.admissionRecordId
        : undefined;
    if (!university.trim() || !department.trim()) continue;
    out.push({
      university,
      department,
      admissionType,
      signal,
      hasSuneungMinimum,
      admissionRecordId,
    });
  }
  return out;
}

export function SimulatorClient({ studentId }: { studentId: string }) {
  const [cards, setCards] = useState<SimulatorPortfolioCard[]>([]);
  const [signalRows, setSignalRows] = useState<SignalScanRow[]>([]);
  const [admissionYear, setAdmissionYear] = useState(2026);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/simulator", { cache: "no-store" });
      const body = (await res.json()) as GetOk | ApiErr;
      if (!res.ok || body.error) {
        setLoadError(body.error?.message ?? `불러오기 실패 (${res.status})`);
        return;
      }
      const raw = body.data.portfolio?.cards;
      const parsed = parseStoredCards(raw);
      setCards(
        parsed.map((c) => ({
          ...c,
          clientKey: crypto.randomUUID(),
        })),
      );
    } catch {
      setLoadError("네트워크 오류로 저장본을 불러오지 못했습니다.");
    }
  }, []);

  const loadSignals = useCallback(async () => {
    setSignalsError(null);
    try {
      const sp = new URLSearchParams({ studentId, medShift: "0" });
      const res = await fetch(`/api/signals?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as {
        data: { items: SignalScanRow[]; meta: { admission_year: number } } | null;
        error: { message?: string } | null;
      };
      if (!res.ok || body.error) {
        setSignalRows([]);
        setSignalsError(body.error?.message ?? `신호등 로드 실패 (${res.status})`);
        return;
      }
      if (body.data) {
        setSignalRows(body.data.items);
        setAdmissionYear(body.data.meta.admission_year);
      }
    } catch {
      setSignalRows([]);
      setSignalsError("신호등 데이터를 불러오지 못했습니다.");
    }
  }, [studentId]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  const jeonsiSignals = useMemo(
    () =>
      signalRows
        .filter((r) => r.admission_type === "정시")
        .map((r) => ({ university: r.university_name, signal: r.signal })),
    [signalRows],
  );

  const persistPayload = useMemo(
    () =>
      cards.map((c) => ({
        university: c.university,
        department: c.department,
        admissionType: c.admissionType,
        signal: c.signal,
        hasSuneungMinimum: c.hasSuneungMinimum,
        ...(c.admissionRecordId != null ? { admissionRecordId: c.admissionRecordId } : {}),
      })),
    [cards],
  );

  const save = useCallback(async () => {
    if (cards.length > 6) {
      setSaveMessage("저장하려면 카드를 6장 이하로 줄여 주세요.");
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: persistPayload }),
      });
      const body = (await res.json()) as PostOk | ApiErr;
      if (!res.ok || body.error) {
        setSaveMessage(body.error?.message ?? `저장 실패 (${res.status})`);
        return;
      }
      setSaveMessage("저장했습니다.");
    } catch {
      setSaveMessage("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }, [cards.length, persistPayload]);

  return (
    <div className="space-y-6">
      {(loadError || signalsError) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {loadError ? <p>{loadError}</p> : null}
          {signalsError ? <p>{signalsError}</p> : null}
        </div>
      )}

      <PortfolioBuilder
        cards={cards}
        onCardsChange={setCards}
        signalRows={signalRows}
        admissionYear={admissionYear}
      />

      <PortfolioSummary cards={cards} jeonsiSignals={jeonsiSignals} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={() => void save()} disabled={saving || cards.length > 6}>
          {saving ? "저장 중…" : "포트폴리오 저장"}
        </Button>
        {saveMessage ? <span className="text-muted-foreground text-sm">{saveMessage}</span> : null}
      </div>
    </div>
  );
}
