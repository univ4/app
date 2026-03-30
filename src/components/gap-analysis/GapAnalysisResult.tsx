"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GapAnalysisDonePayload, GapAnalysisSection } from "@/types/gapAnalysis";

/** 근거 인용(`>`) 구간을 시각적으로 구분 */
function renderSectionBody(text: string) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let quoteLines: string[] = [];
  let key = 0;

  const flushQuote = () => {
    if (quoteLines.length === 0) return;
    const q = quoteLines.join("\n");
    quoteLines = [];
    out.push(
      <blockquote
        key={`q-${key++}`}
        className="border-primary text-foreground my-2 border-l-4 bg-muted/60 py-2 pr-2 pl-3 text-sm leading-relaxed"
      >
        {q}
      </blockquote>,
    );
  };

  for (const line of lines) {
    if (line.startsWith(">")) {
      quoteLines.push(line.replace(/^>\s?/, "").trimEnd());
    } else {
      flushQuote();
      if (line.trim().length > 0) {
        out.push(
          <p key={`p-${key++}`} className="mb-2 text-sm leading-relaxed last:mb-0">
            {line}
          </p>,
        );
      }
    }
  }
  flushQuote();
  return <div className="text-foreground">{out}</div>;
}

const SECTION_ORDER: { key: GapAnalysisSection["key"]; label: string }[] = [
  { key: "strengths", label: "강점" },
  { key: "gaps", label: "보완점" },
  { key: "actions", label: "액션 플랜" },
];

export type GapAnalysisResultProps = {
  streamingText: string;
  donePayload: GapAnalysisDonePayload | null;
  loading: boolean;
};

export function GapAnalysisResult({
  streamingText,
  donePayload,
  loading,
}: GapAnalysisResultProps) {
  const sectionsFromDone = donePayload?.sections ?? [];
  const sectionByKey = new Map(
    sectionsFromDone.map((s) => [s.key, s] as const),
  );
  const showStructured = sectionsFromDone.length > 0;

  return (
    <div className="space-y-4">
      <div
        className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm"
        role="note"
      >
        이 기능은 문장 대필·자동 작성을 제공하지 않으며, 주제·근거·실행 순서만 제안합니다. 최종
        기재는 학교 지침과 본인 판단에 따릅니다.
      </div>

      {(streamingText.length > 0 || loading) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">스트리밍 결과</CardTitle>
            <CardDescription>모델 출력이 실시간으로 누적됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/40 max-h-[min(24rem,50vh)] overflow-y-auto rounded-md border p-3 text-sm whitespace-pre-wrap">
              {streamingText || (loading ? "…" : "")}
            </div>
          </CardContent>
        </Card>
      )}

      {showStructured && (
        <div className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">섹션별 정리</h2>
          <div className="grid gap-4 md:grid-cols-1">
            {SECTION_ORDER.map(({ key, label }) => {
              const sec = sectionByKey.get(key);
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{sec?.title ?? label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {sec?.content
                      ? renderSectionBody(sec.content)
                      : "이 섹션을 파싱하지 못했습니다. 위 스트리밍 텍스트를 확인하세요."}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {donePayload?.finish_reason === "no_context" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          적재된 세특 청크가 없어 안내 메시지만 표시되었습니다.
        </p>
      )}
      {donePayload?.finish_reason === "no_guidelines" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          전형계획 청크를 찾지 못해 안내 메시지만 표시되었습니다.
        </p>
      )}
    </div>
  );
}
