"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ResearchDifficulty, ResearchTopicsDonePayload } from "@/types/researchTopics";

function difficultyVariant(
  d: ResearchDifficulty | "",
): "destructive" | "default" | "secondary" | "outline" {
  if (d === "상") return "destructive";
  if (d === "중") return "default";
  if (d === "하") return "secondary";
  return "outline";
}

export type ResearchTopicsResultProps = {
  streamingText: string;
  donePayload: ResearchTopicsDonePayload | null;
  loading: boolean;
};

export function ResearchTopicsResult({
  streamingText,
  donePayload,
  loading,
}: ResearchTopicsResultProps) {
  const topics = donePayload?.topics ?? [];
  const showCards = topics.length > 0;

  return (
    <div className="space-y-4">
      <div
        className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm"
        role="note"
      >
        이 기능은 문장 대필·세특 자동 작성을 제공하지 않으며, 탐구 주제·방향·연계만 제안합니다. 최종
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

      {showCards && (
        <div className="space-y-3">
          <h2 className="text-foreground text-lg font-semibold">추천 주제</h2>
          <div className="grid gap-4 md:grid-cols-1">
            {topics.map((t) => (
              <Card key={`${t.index}-${t.title}`}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {t.index}. {t.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.difficulty ? (
                        <Badge variant={difficultyVariant(t.difficulty)}>
                          난이도 {t.difficulty}
                        </Badge>
                      ) : null}
                      {t.durationLabel ? (
                        <Badge variant="outline">소요 {t.durationLabel}</Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
                  {t.linkedSubject ? (
                    <p>
                      <span className="text-foreground font-medium">연계 교과: </span>
                      {t.linkedSubject}
                    </p>
                  ) : null}
                  {t.direction ? (
                    <p>
                      <span className="text-foreground font-medium">탐구 방향: </span>
                      {t.direction}
                    </p>
                  ) : null}
                  {t.univLink ? (
                    <p>
                      <span className="text-foreground font-medium">목표 대학 연계점: </span>
                      {t.univLink}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {donePayload?.finish_reason === "no_context" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          세특 청크가 없어 안내 메시지만 표시되었습니다.
        </p>
      )}
      {donePayload?.finish_reason === "no_guidelines" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          전형계획 청크를 찾지 못해 안내 메시지만 표시되었습니다.
        </p>
      )}

      {donePayload && !showCards && streamingText.length > 0 && donePayload.finish_reason === "stop" && (
        <p className="text-muted-foreground text-xs">
          주제별 카드로 파싱되지 않았습니다. 위 스트리밍 텍스트를 확인하세요.
        </p>
      )}
    </div>
  );
}
