"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProbabilitySignal,
  type ProbabilitySignalItem,
} from "@/components/analysis/ProbabilitySignal";

const UNIVERSITIES = ["서강대", "성균관대", "한양대"] as const;
const ADMISSION_TYPE = "정시" as const;

export default function AnalysisPage() {
  const [items, setItems] = useState<ProbabilitySignalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analysis/probability?universities=${encodeURIComponent(
            UNIVERSITIES.join(","),
          )}&admission_type=${encodeURIComponent(ADMISSION_TYPE)}`,
          { cache: "no-store" },
        );

        const json = await response.json();
        if (!response.ok) {
          setError(json?.error?.message ?? "분석 데이터를 불러오지 못했습니다.");
          return;
        }

        setItems((json ?? []) as ProbabilitySignalItem[]);
      } catch {
        setError("분석 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Link href="/dashboard/analysis/minimum-check" className="block">
        <Card>
          <CardHeader>
            <CardTitle>수능최저 충족 분석</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            현재 등급 기준 충족 여부 확인 및 슬라이더 시뮬레이션
          </CardContent>
        </Card>
      </Link>

      {loading ? (
        <div className="flex flex-col gap-4 lg:flex-row">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-full">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <ProbabilitySignal items={items} admissionType={ADMISSION_TYPE} />
      )}
    </div>
  );
}

