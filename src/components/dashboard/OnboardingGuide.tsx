"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-onboarding-complete";

type OnboardingGuideProps = {
  hasScores: boolean;
  hasStudentRecord: boolean;
  hasSignalsReady: boolean;
};

export function OnboardingGuide({
  hasScores,
  hasStudentRecord,
  hasSignalsReady,
}: OnboardingGuideProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  const steps = useMemo(
    () => [
      { href: "/dashboard/scores", label: "1단계: 성적 입력", done: hasScores },
      { href: "/dashboard/student-record", label: "2단계: 생활기록부 입력", done: hasStudentRecord },
      { href: "/dashboard/signals", label: "3단계: 합격 신호등 확인", done: hasSignalsReady },
    ],
    [hasScores, hasStudentRecord, hasSignalsReady],
  );

  const allCompleted = steps.every((step) => step.done);

  useEffect(() => {
    if (allCompleted) {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
  }, [allCompleted]);

  if (dismissed || allCompleted) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">빠른 시작 가이드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
              step.done ? "border-primary/30 bg-accent text-accent-foreground" : "border-border hover:bg-muted",
            )}
          >
            <span className="text-sm font-medium">{step.label}</span>
            {step.done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
          </Link>
        ))}
        <div className="pt-1 text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "true");
              setDismissed(true);
            }}
          >
            가이드 닫기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
