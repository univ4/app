"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlacementTableRow } from "@/lib/calculators/calcPlacementTable";

type ApiOk = {
  data: {
    safe: PlacementTableRow[];
    moderate: PlacementTableRow[];
    challenge: PlacementTableRow[];
    meta: {
      admission_year: number;
      my_score_used: number;
      med_shift_enabled: boolean;
      region: string;
      row_count_jeongsi_filtered: number;
      suggested_my_score: number | null;
      suggested_reference: string | null;
      has_mock_exam: boolean;
      duration_ms: number;
    };
  };
  error: null;
};

type ApiErr = {
  data: null;
  error: { code: string; message: string };
};

function Column({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "safe" | "moderate" | "challenge";
  rows: PlacementTableRow[];
}) {
  const border =
    tone === "safe"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "moderate"
        ? "border-amber-200 bg-amber-50/50"
        : "border-rose-200 bg-rose-50/50";

  return (
    <div className={`flex min-h-[200px] flex-col rounded-lg border p-3 ${border}`}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="max-h-[min(60vh,520px)] space-y-2 overflow-y-auto text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">해당 구간 없음</p>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.univName}-${r.deptName}-${i}`}
              className="rounded-md border border-border/60 bg-background/80 px-2 py-1.5"
            >
              <div className="font-medium leading-snug">{r.univName}</div>
              <div className="text-muted-foreground text-xs">{r.deptName}</div>
              <div className="mt-1 flex justify-between text-xs tabular-nums">
                <span>컷 {r.cutoff.toFixed(2)}</span>
                <span className={r.gap >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  차이 {r.gap >= 0 ? "+" : ""}
                  {r.gap.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PlacementTableView() {
  const [myScoreInput, setMyScoreInput] = useState("");
  const scoreInputRef = useRef(myScoreInput);
  scoreInputRef.current = myScoreInput;

  const [medShift, setMedShift] = useState(false);
  const [region, setRegion] = useState<"seoul" | "sudogwon" | "all">("all");

  const [safe, setSafe] = useState<PlacementTableRow[]>([]);
  const [moderate, setModerate] = useState<PlacementTableRow[]>([]);
  const [challenge, setChallenge] = useState<PlacementTableRow[]>([]);
  const [meta, setMeta] = useState<ApiOk["data"]["meta"] | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      const trimmed = scoreInputRef.current.trim();
      if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
        sp.set("myScore", trimmed);
      }
      sp.set("medShift", medShift ? "1" : "0");
      sp.set("region", region);

      const res = await fetch(`/api/placement-table?${sp.toString()}`, { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setSafe([]);
        setModerate([]);
        setChallenge([]);
        setMeta(null);
        setError(body.error?.message ?? `요청 실패 (${res.status})`);
        return;
      }
      setSafe(body.data.safe);
      setModerate(body.data.moderate);
      setChallenge(body.data.challenge);
      setMeta(body.data.meta);
      if (trimmed === "" && body.data.meta.my_score_used != null) {
        setMyScoreInput(String(body.data.meta.my_score_used));
      }
    } catch {
      setSafe([]);
      setModerate([]);
      setChallenge([]);
      setMeta(null);
      setError("네트워크 오류로 배치표를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [medShift, region]);

  useEffect(() => {
    void load();
  }, [load]);

  const applySuggested = () => {
    if (meta?.suggested_my_score != null) {
      setMyScoreInput(String(meta.suggested_my_score));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>조건</CardTitle>
          <CardDescription>
            내 수능 환산점수(§4 정시 계산기와 동일 스케일)를 기준으로 입결 컷과 비교합니다. 미입력 시
            최근 모의고사와 서강대 자연계열 반영비로 제안 점수를 씁니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="placement-score">내 환산점수</Label>
              <Input
                id="placement-score"
                inputMode="decimal"
                placeholder="비우면 모의고사 제안"
                value={myScoreInput}
                onChange={(e) => setMyScoreInput(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">지역</Label>
              <select
                className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
                value={region}
                onChange={(e) => setRegion(e.target.value as "seoul" | "sudogwon" | "all")}
              >
                <option value="all">전국</option>
                <option value="seoul">서울</option>
                <option value="sudogwon">수도권</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label
                htmlFor="placement-med-shift"
                className="flex min-h-11 cursor-pointer items-center gap-3 py-1 sm:min-h-0"
              >
                <input
                  id="placement-med-shift"
                  type="checkbox"
                  checked={medShift}
                  onChange={(e) => setMedShift(e.target.checked)}
                  className="size-5 shrink-0 rounded border border-input sm:size-4"
                />
                <span className="text-sm font-normal">보정 계수 (의대 증원 등)</span>
              </label>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button type="button" variant="secondary" onClick={applySuggested} disabled={!meta?.suggested_my_score}>
                모의고사 제안 점수 적용
              </Button>
              <Button type="button" onClick={() => void load()} disabled={loading}>
                {loading ? "불러오는 중…" : "다시 계산"}
              </Button>
            </div>
          </div>

          {meta && (
            <p className="text-muted-foreground text-xs">
              적용 점수: <span className="font-medium text-foreground">{meta.my_score_used.toFixed(4)}</span>
              {meta.suggested_reference ? (
                <>
                  {" "}
                  · 제안 기준: {meta.suggested_reference}
                </>
              ) : null}
              {meta.has_mock_exam ? " · 모의고사 있음" : " · 모의고사 없음"} · 필터 행{" "}
              {meta.row_count_jeongsi_filtered} · {meta.duration_ms}ms
            </p>
          )}

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Column title="안정" tone="safe" rows={safe} />
        <Column title="적정" tone="moderate" rows={moderate} />
        <Column title="도전" tone="challenge" rows={challenge} />
      </div>
    </div>
  );
}
