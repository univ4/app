"use client";

import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CalcEarlyRoadmapResult,
  EarlyRoadmapMilestone,
  EarlyRoadmapPhaseRow,
} from "@/lib/calculators/calcEarlyRoadmap";

export interface RoadmapTimelineProps {
  data: CalcEarlyRoadmapResult | null;
  currentPhaseLabel: string;
}

function importanceBadgeVariant(
  i: EarlyRoadmapMilestone["importance"],
): "default" | "secondary" | "outline" {
  if (i === "critical") return "default";
  if (i === "important") return "secondary";
  return "outline";
}

function importanceLabel(i: EarlyRoadmapMilestone["importance"]): string {
  if (i === "critical") return "핵심";
  if (i === "important") return "중요";
  return "참고";
}

function PriorityChecklist({
  phaseTitle,
  items,
}: {
  phaseTitle: string;
  items: string[];
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    (key: string) => {
      setDone((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [setDone],
  );

  return (
    <ul className="space-y-2">
      {items.map((text, idx) => {
        const key = `${phaseTitle}-${idx}`;
        const checked = done[key] ?? false;
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={
                checked
                  ? "text-muted-foreground text-left line-through decoration-muted-foreground/80"
                  : "text-foreground text-left"
              }
            >
              <span className="mr-2 inline-block w-4 text-center" aria-hidden>
                {checked ? "☑" : "☐"}
              </span>
              {text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function RoadmapTimeline({ data, currentPhaseLabel }: RoadmapTimelineProps) {
  if (!data) {
    return (
      <p className="text-muted-foreground text-sm">
        조건을 선택한 뒤 「로드맵 적용」을 누르면 학기별 타임라인이 표시됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">요약</CardTitle>
          <CardDescription className="text-foreground">{data.summary}</CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h2 className="text-foreground mb-3 text-lg font-semibold">학기별 로드맵</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          현재 학기({currentPhaseLabel})는 강조되어 있습니다. 합격을 보장하지 않습니다.
        </p>
        <ol className="relative space-y-6 border-l-2 border-muted pl-6">
          {data.phases.map((row: EarlyRoadmapPhaseRow) => {
            const isCurrent = row.phase === currentPhaseLabel;
            return (
              <li key={row.phase} className="relative">
                <span
                  className={
                    isCurrent
                      ? "bg-primary ring-primary/30 absolute -left-[29px] top-1 h-3 w-3 rounded-full ring-4"
                      : "bg-muted-foreground/40 absolute -left-[26px] top-1.5 h-2 w-2 rounded-full"
                  }
                  aria-hidden
                />
                <Card
                  className={
                    isCurrent
                      ? "border-primary shadow-sm ring-2 ring-primary/20"
                      : "border-border"
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <CardTitle className="text-base">{row.phase}</CardTitle>
                      <span className="text-muted-foreground text-sm">{row.period}</span>
                      {isCurrent ? (
                        <Badge variant="default" className="text-xs">
                          현재 학기
                        </Badge>
                      ) : null}
                    </div>
                    {row.warning ? (
                      <CardDescription className="text-amber-800 dark:text-amber-200">
                        {row.warning}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1 font-medium">내신 목표</p>
                      <p>{row.gpaTarget}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 font-medium">우선순위</p>
                      <PriorityChecklist phaseTitle={row.phase} items={row.priority} />
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 font-medium">권장 활동</p>
                      <ul className="list-inside list-disc space-y-1">
                        {row.activities.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>

      <div>
        <h2 className="text-foreground mb-3 text-lg font-semibold">주요 마일스톤</h2>
        <ul className="space-y-3">
          {data.keyMilestones.map((m) => (
            <li key={m.milestone}>
              <Card>
                <CardHeader className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={importanceBadgeVariant(m.importance)}>
                      {importanceLabel(m.importance)}
                    </Badge>
                    <span className="text-muted-foreground text-sm">{m.timing}</span>
                  </div>
                  <CardDescription className="text-foreground pt-1">{m.milestone}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
