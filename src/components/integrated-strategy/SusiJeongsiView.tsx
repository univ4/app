"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { NapchiRiskCard } from "./NapchiRiskCard";

type PortfolioCardStored = {
  university: string;
  department: string;
  admissionType: string;
  signal: "safe" | "moderate" | "challenge";
  hasSuneungMinimum?: boolean;
};

type IntegratedApiOk = {
  data: {
    napchiRisks: {
      university: string;
      admissionType: string;
      riskLevel: "low" | "medium" | "high";
      message: string;
      opportunityCost: string;
    }[];
    allFailScenario: { jeongsiSafeUnivs: string[]; message: string };
    overallRisk: "balanced" | "aggressive" | "too_safe";
    summary: string;
  };
  error: null;
};

type ApiErr = { data: null; error: { code: string; message: string } };

function overallLabel(level: "balanced" | "aggressive" | "too_safe") {
  if (level === "balanced") return "균형";
  if (level === "aggressive") return "공격적";
  return "과도한 안정";
}

export function SusiJeongsiView() {
  const [cards, setCards] = useState<PortfolioCardStored[]>([]);
  const [integrated, setIntegrated] = useState<IntegratedApiOk["data"] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [simRes, intRes] = await Promise.all([
        fetch("/api/simulator", { cache: "no-store" }),
        fetch("/api/integrated-strategy", { cache: "no-store" }),
      ]);
      const simBody = (await simRes.json()) as
        | { data: { portfolio: { cards: unknown } | null }; error: null }
        | ApiErr;
      const intBody = (await intRes.json()) as IntegratedApiOk | ApiErr;

      if (!simRes.ok || simBody.error) {
        setLoadError(simBody.error?.message ?? `시뮬레이터 (${simRes.status})`);
        return;
      }
      if (!intRes.ok || intBody.error) {
        setLoadError(intBody.error?.message ?? `통합 전략 (${intRes.status})`);
        return;
      }

      const raw = simBody.data.portfolio?.cards;
      const parsed: PortfolioCardStored[] = [];
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (typeof item !== "object" || item === null) continue;
          const o = item as Record<string, unknown>;
          const university = typeof o.university === "string" ? o.university : "";
          const department = typeof o.department === "string" ? o.department : "";
          const admissionType = typeof o.admissionType === "string" ? o.admissionType : "";
          const signal =
            o.signal === "safe" || o.signal === "moderate" || o.signal === "challenge"
              ? o.signal
              : "moderate";
          if (!university.trim() || !department.trim()) continue;
          parsed.push({
            university,
            department,
            admissionType,
            signal,
            hasSuneungMinimum: Boolean(o.hasSuneungMinimum),
          });
        }
      }
      setCards(parsed);
      setIntegrated(intBody.data);
    } catch {
      setLoadError("데이터를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>수시 6장 포트폴리오</CardTitle>
          <CardDescription>
            원서 배분 시뮬레이터에 저장된 카드입니다.{" "}
            <Link href="/dashboard/simulator" className="text-primary underline">
              시뮬레이터에서 편집
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              저장된 카드가 없습니다. 시뮬레이터에서 수시 6장을 구성해 주세요.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cards.map((c, i) => (
                <li
                  key={`${c.university}-${c.department}-${i}`}
                  className="flex flex-wrap items-center gap-2 border-b border-border pb-2 last:border-0"
                >
                  <span className="font-medium">{c.university}</span>
                  <span className="text-muted-foreground">{c.department}</span>
                  <Badge variant="outline">{c.admissionType}</Badge>
                  <Badge variant="secondary">신호 {c.signal}</Badge>
                  {c.hasSuneungMinimum ? (
                    <Badge variant="outline">수능최저</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {integrated ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>수시·정시 통합 요약</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>포트폴리오 성향:</span>
                <Badge>{overallLabel(integrated.overallRisk)}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{integrated.summary}</p>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">수시 납치 리스크 (카드별)</h2>
            {integrated.napchiRisks.length === 0 ? (
              <p className="text-muted-foreground text-sm">포트폴리오 카드가 없습니다.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {integrated.napchiRisks.map((row, idx) => (
                  <NapchiRiskCard key={`${row.university}-${row.admissionType}-${idx}`} row={row} />
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>수시 전원 불합격 시 · 정시 안전망</CardTitle>
              <CardDescription>정시 신호등 ‘안정’이 있는 대학 (자동 생성)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrated.allFailScenario.jeongsiSafeUnivs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {integrated.allFailScenario.jeongsiSafeUnivs.map((u) => (
                    <Badge key={u} variant="secondary">
                      {u}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {integrated.allFailScenario.message}
              </p>
            </CardContent>
          </Card>
        </>
      ) : !loadError ? (
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      ) : null}
    </div>
  );
}
