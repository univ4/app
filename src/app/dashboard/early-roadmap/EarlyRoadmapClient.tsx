"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import {
  RoadmapSetup,
  roadmapSetupDefaults,
  type RoadmapSetupValues,
} from "@/components/early-roadmap/RoadmapSetup";
import { RoadmapTimeline } from "@/components/early-roadmap/RoadmapTimeline";
import type { CalcEarlyRoadmapResult } from "@/lib/calculators/calcEarlyRoadmap";

type ApiOk = {
  data: CalcEarlyRoadmapResult;
  error: null;
};
type ApiErr = { data: null; error: { code: string; message: string } };

function currentPhaseLabelFromValues(v: RoadmapSetupValues): string {
  return `고${v.currentGrade} ${v.currentSemester}학기`;
}

export function EarlyRoadmapClient() {
  const [values, setValues] = useState<RoadmapSetupValues>(roadmapSetupDefaults);
  const [result, setResult] = useState<CalcEarlyRoadmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedLabel, setAppliedLabel] = useState<string>(
    currentPhaseLabelFromValues(roadmapSetupDefaults),
  );

  const onApply = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/early-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentGrade: values.currentGrade,
          currentSemester: values.currentSemester,
          targetUnivType: values.targetUnivType,
          targetDept: values.targetDept,
        }),
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setResult(null);
        setError(body.error?.message ?? "로드맵을 불러오지 못했습니다.");
        return;
      }
      setResult(body.data);
      setAppliedLabel(currentPhaseLabelFromValues(values));
    } catch {
      setResult(null);
      setError("네트워크 오류로 로드맵을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [values]);

  return (
    <div className="space-y-8">
      <CardIntro />
      <RoadmapSetup values={values} onChange={setValues} onApply={onApply} loading={loading} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <RoadmapTimeline data={result} currentPhaseLabel={appliedLabel} />
    </div>
  );
}

function CardIntro() {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm">
      <p className="text-foreground font-medium">고1·고2 학생·학부모 안내</p>
      <p className="text-muted-foreground mt-1">
        학년·학기·목표 대학 수준·계열을 바꾸면 내신 목표 문구와 권장 활동이 달라집니다. 결과는 참고용이며
        합격을 보장하지 않습니다.
      </p>
      <Link href="/dashboard" className="text-primary mt-3 inline-block text-sm underline">
        대시보드로
      </Link>
    </div>
  );
}
