"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdvantageResult } from "@/components/subject-analysis/AdvantageResult";
import { EligibilityResult } from "@/components/subject-analysis/EligibilityResult";
import { SubjectProfileForm } from "@/components/subject-analysis/SubjectProfileForm";

type ProfileDto = {
  year: number;
  korean_subject: string;
  math_subject: string;
  science1: string | null;
  science2: string | null;
  social1: string | null;
  social2: string | null;
  second_foreign: string | null;
} | null;

type AnalysisPayload = {
  profile: ProfileDto;
  eligibility: {
    eligibleUniversityCount: number;
    totalReferenceUniversities: number;
    universitiesWithRequirementData: number;
    ineligible: { universityName: string; departmentName: string; reasons: string[] }[];
  };
  advantage: {
    advantageUnivs: string[];
    disadvantageUnivs: string[];
    neutralUnivs: string[];
    summary: string;
  };
};

type ApiOk = { data: AnalysisPayload; error: null };
type ApiErr = { data: null; error: { code: string; message: string } };

export function SubjectAnalysisClient() {
  const [payload, setPayload] = useState<AnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subject-analysis", { cache: "no-store" });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setPayload(null);
        setError(body.error?.message ?? "분석을 불러오지 못했습니다.");
        return;
      }
      setPayload(body.data);
    } catch {
      setPayload(null);
      setError("네트워크 오류로 분석을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">선택과목 분석</h1>
          <p className="text-muted-foreground text-sm">
            2027학년도 수능 선택과목 기준 지원 가능 여부와 정시 반영비 유불리 요약
          </p>
        </div>
        <Link href="/dashboard" className="text-primary text-sm underline">
          대시보드로
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : payload ? (
        <>
          <SubjectProfileForm initialProfile={payload.profile} onSaved={load} />
          <EligibilityResult
            eligibleUniversityCount={payload.eligibility.eligibleUniversityCount}
            totalReferenceUniversities={payload.eligibility.totalReferenceUniversities}
            universitiesWithRequirementData={payload.eligibility.universitiesWithRequirementData}
            ineligible={payload.eligibility.ineligible}
          />
          <AdvantageResult
            advantageUnivs={payload.advantage.advantageUnivs}
            disadvantageUnivs={payload.advantage.disadvantageUnivs}
            neutralUnivs={payload.advantage.neutralUnivs}
            summary={payload.advantage.summary}
          />
        </>
      ) : null}
    </div>
  );
}
