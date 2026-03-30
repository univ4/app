"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { parseMockInterviewQuestionBlocks } from "@/lib/chat/mockInterview";
import type { InterviewType } from "@/types/mockInterview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }
  const data = dataLines.join("\n");
  if (!data) return null;
  return { event, data };
}

function flushSseBuffer(
  buffer: string,
  onChunk: (text: string) => void,
  onDone: () => void,
): string {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const parsed = parseSseBlock(trimmed);
    if (!parsed) continue;
    try {
      if (parsed.event === "chunk") {
        const j = JSON.parse(parsed.data) as { text?: string };
        if (typeof j.text === "string" && j.text.length > 0) {
          onChunk(j.text);
        }
      } else if (parsed.event === "done") {
        onDone();
      }
    } catch {
      /* skip */
    }
  }
  return rest;
}

type InterviewSessionProps = {
  targetUniv: string;
  interviewType: InterviewType;
  questionsMarkdown: string;
  questionsLoading: boolean;
  onQuestionsConsumed: () => void;
};

export function InterviewSession({
  targetUniv,
  interviewType,
  questionsMarkdown,
  questionsLoading,
  onQuestionsConsumed,
}: InterviewSessionProps) {
  const questionBlocks = useMemo(() => {
    const parsed = parseMockInterviewQuestionBlocks(questionsMarkdown);
    if (parsed.length > 0) return parsed;
    const t = questionsMarkdown.trim();
    return t.length > 0 ? [t] : [];
  }, [questionsMarkdown]);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedbackByIndex, setFeedbackByIndex] = useState<Record<number, string>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<number | null>(null);
  const [saveLoading, setSaveLoading] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const runFeedback = useCallback(
    async (index: number, questionBlock: string) => {
      const answer = (answers[index] ?? "").trim();
      if (answer.length === 0) {
        return;
      }
      setSaveMessage(null);
      setLoadingFeedback(index);
      setFeedbackByIndex((prev) => ({ ...prev, [index]: "" }));

      let res: Response;
      try {
        res = await fetch("/api/mock-interview/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            question: questionBlock,
            answer,
            targetUniv,
          }),
        });
      } catch {
        setLoadingFeedback(null);
        setFeedbackByIndex((prev) => ({
          ...prev,
          [index]: "네트워크 오류로 피드백을 받을 수 없습니다.",
        }));
        return;
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || ct.includes("application/json")) {
        setLoadingFeedback(null);
        let msg = `요청 실패 (${res.status})`;
        try {
          const j = (await res.json()) as {
            error?: { message?: string };
          };
          if (j?.error?.message) msg = j.error.message;
        } catch {
          /* keep */
        }
        setFeedbackByIndex((prev) => ({ ...prev, [index]: msg }));
        return;
      }

      if (!res.body) {
        setLoadingFeedback(null);
        setFeedbackByIndex((prev) => ({
          ...prev,
          [index]: "응답 본문이 비어 있습니다.",
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      let acc = "";

      const appendChunk = (chunk: string) => {
        acc += chunk;
        setFeedbackByIndex((prev) => ({ ...prev, [index]: acc }));
      };

      const drainTail = (tail: string) => {
        const t = tail.trim();
        if (!t) return;
        const parsed = parseSseBlock(t);
        if (!parsed) return;
        try {
          if (parsed.event === "chunk") {
            const j = JSON.parse(parsed.data) as { text?: string };
            if (typeof j.text === "string" && j.text.length > 0) appendChunk(j.text);
          }
        } catch {
          /* ignore */
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          carry += decoder.decode(value, { stream: true });
          carry = flushSseBuffer(carry, appendChunk, () => {});
        }
        carry += decoder.decode();
        drainTail(carry);
      } catch {
        setFeedbackByIndex((prev) => ({
          ...prev,
          [index]: "스트림 처리 중 오류가 났습니다.",
        }));
      } finally {
        reader.releaseLock();
        setLoadingFeedback(null);
      }
    },
    [answers, targetUniv],
  );

  const saveRecord = useCallback(
    async (index: number, questionBlock: string) => {
      const answer = (answers[index] ?? "").trim();
      const feedback = (feedbackByIndex[index] ?? "").trim();
      if (answer.length === 0) return;

      setSaveMessage(null);
      setSaveLoading(index);
      try {
        const res = await fetch("/api/mock-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            targetUniv,
            interviewType,
            question: questionBlock,
            answer,
            feedback: feedback.length > 0 ? feedback : null,
          }),
        });
        const j = (await res.json()) as {
          error?: { message?: string };
        };
        if (!res.ok) {
          setSaveMessage(j?.error?.message ?? `저장 실패 (${res.status})`);
        } else {
          setSaveMessage("저장했습니다.");
          onQuestionsConsumed();
        }
      } catch {
        setSaveMessage("네트워크 오류로 저장하지 못했습니다.");
      } finally {
        setSaveLoading(null);
      }
    },
    [answers, feedbackByIndex, interviewType, onQuestionsConsumed, targetUniv],
  );

  if (questionsLoading && questionsMarkdown.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-sm">
        질문을 생성하는 중입니다…
      </div>
    );
  }

  if (questionsMarkdown.trim().length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/30 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm">{questionsMarkdown}</pre>
      </div>

      {questionBlocks.length > 0 ? (
        <div className="space-y-8">
          {questionBlocks.map((block, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="text-muted-foreground text-xs font-medium">
                질문 {idx + 1}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{block}</pre>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ans-${idx}`}>답변</Label>
                <textarea
                  id={`ans-${idx}`}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={answers[idx] ?? ""}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                  }
                  rows={5}
                  placeholder="답변을 입력하세요."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  disabled={
                    loadingFeedback !== null ||
                    (answers[idx] ?? "").trim().length === 0
                  }
                  onClick={() => void runFeedback(idx, block)}
                >
                  {loadingFeedback === idx ? "피드백 생성 중…" : "피드백 받기"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    saveLoading !== null ||
                    (answers[idx] ?? "").trim().length === 0 ||
                    loadingFeedback === idx
                  }
                  onClick={() => void saveRecord(idx, block)}
                >
                  {saveLoading === idx ? "저장 중…" : "이 세션 저장"}
                </Button>
              </div>
              {feedbackByIndex[idx] != null && feedbackByIndex[idx] !== "" ? (
                <div className="prose prose-sm dark:prose-invert bg-muted/40 max-w-none rounded-md p-3">
                  <p className="text-muted-foreground text-xs font-medium">피드백</p>
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {feedbackByIndex[idx]}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {saveMessage ? (
        <p className="text-muted-foreground text-sm" role="status">
          {saveMessage}
        </p>
      ) : null}
    </div>
  );
}
