"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PersonalStatementFeedbackDonePayload,
  PersonalStatementSection,
} from "@/types/personalStatement";

const SECTION_ORDER: { key: PersonalStatementSection["key"]; label: string }[] = [
  { key: "char_count", label: "글자수 확인" },
  { key: "academic", label: "학업역량" },
  { key: "career", label: "진로역량" },
  { key: "community", label: "공동체역량" },
  { key: "suggestions", label: "개선 제안" },
];

function renderBody(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <p key={i} className="mb-2 text-sm leading-relaxed last:mb-0">
      {line}
    </p>
  ));
}

export type FeedbackViewProps = {
  streamingText: string;
  donePayload: PersonalStatementFeedbackDonePayload | null;
  loading: boolean;
  errorBanner: string | null;
};

export function FeedbackView({
  streamingText,
  donePayload,
  loading,
  errorBanner,
}: FeedbackViewProps) {
  const sectionsFromDone = donePayload?.sections ?? [];
  const sectionByKey = new Map(
    sectionsFromDone.map((s) => [s.key, s] as const),
  );
  const showStructured = sectionsFromDone.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">코치 피드백</CardTitle>
          <CardDescription>
            생활기록부에 적재된 청크만 근거로 합니다. 문장 대필은 제공하지 않으며 방향·개선점만
            안내합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div
            className="bg-muted/30 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="note"
          >
            <strong className="font-medium">문장 대필 금지</strong>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              본 서비스는 초안을 대신 쓰지 않습니다. 평가요소별 코멘트와 수정 방향만 제시합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {errorBanner ? (
        <div
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          role="alert"
        >
          {errorBanner}
        </div>
      ) : null}

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
          <h2 className="text-foreground text-lg font-semibold">역량·항목별 정리</h2>
          <div className="grid gap-4">
            {SECTION_ORDER.map(({ key, label }) => {
              const sec = sectionByKey.get(key);
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {sec?.content
                      ? renderBody(sec.content)
                      : "이 블록을 파싱하지 못했습니다. 위 스트리밍 텍스트를 확인하세요."}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {donePayload?.finish_reason === "no_context" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          적재된 생기부 청크가 없어 안내 메시지만 표시되었습니다.
        </p>
      )}
    </div>
  );
}
