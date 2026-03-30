"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { FeedbackView } from "@/components/personal-statement/FeedbackView";
import { StatementEditor } from "@/components/personal-statement/StatementEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";
import type {
  PersonalStatementFeedbackDonePayload,
  PersonalStatementRow,
} from "@/types/personalStatement";

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
  onDone: (payload: PersonalStatementFeedbackDonePayload) => void,
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
        const j = JSON.parse(parsed.data) as PersonalStatementFeedbackDonePayload;
        onDone(j);
      }
    } catch {
      /* skip malformed */
    }
  }
  return rest;
}

export function PersonalStatementCoach() {
  const [items, setItems] = useState<PersonalStatementRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);
  const [feedbackUniv, setFeedbackUniv] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [donePayload, setDonePayload] = useState<PersonalStatementFeedbackDonePayload | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/personal-statement", { credentials: "same-origin" });
      const j = (await res.json()) as {
        data?: { items?: PersonalStatementRow[] };
        error?: { message?: string };
      };
      if (!res.ok) {
        setLoadError(j.error?.message ?? `목록 불러오기 실패 (${res.status})`);
        return;
      }
      setItems(j.data?.items ?? []);
    } catch {
      setLoadError("네트워크 오류로 목록을 불러올 수 없습니다.");
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const runFeedback = useCallback(async () => {
    if (feedbackLoading || !activeStatementId) return;
    setFeedbackError(null);
    setStreamingText("");
    setDonePayload(null);
    setFeedbackLoading(true);

    const body = {
      statementId: activeStatementId,
      targetUniv: feedbackUniv.trim(),
    };

    let res: Response;
    try {
      res = await fetch("/api/personal-statement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
    } catch {
      setFeedbackLoading(false);
      setFeedbackError("네트워크 오류로 요청을 보낼 수 없습니다.");
      return;
    }

    const ct = res.headers.get("content-type") ?? "";

    if (!res.ok || ct.includes("application/json")) {
      setFeedbackLoading(false);
      let msg = `요청 실패 (${res.status})`;
      try {
        const j = (await res.json()) as {
          error?: { code?: string; message?: string };
        };
        if (j?.error?.message) msg = j.error.message;
      } catch {
        /* keep default */
      }
      setFeedbackError(msg);
      return;
    }

    if (!res.body) {
      setFeedbackLoading(false);
      setFeedbackError("응답 본문이 비어 있습니다.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = "";
    const streamResult: { done: PersonalStatementFeedbackDonePayload | null } = { done: null };

    const appendChunk = (chunk: string) => {
      setStreamingText((prev) => prev + chunk);
    };

    const onDone = (p: PersonalStatementFeedbackDonePayload) => {
      streamResult.done = p;
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
        } else if (parsed.event === "done") {
          onDone(JSON.parse(parsed.data) as PersonalStatementFeedbackDonePayload);
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
        carry = flushSseBuffer(carry, appendChunk, onDone);
      }
      carry += decoder.decode();
      drainTail(carry);
    } catch {
      setFeedbackError("스트림 처리 중 오류가 났습니다.");
    } finally {
      reader.releaseLock();
    }

    setDonePayload(streamResult.done);
    setFeedbackLoading(false);
  }, [activeStatementId, feedbackLoading, feedbackUniv]);

  return (
    <div className="space-y-8">
      {loadError ? (
        <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {loadError}
        </div>
      ) : null}

      <StatementEditor
        items={items}
        onSaved={() => {
          /* list refresh handled in onRefresh */
        }}
        onRefresh={loadItems}
        onActiveStatementChange={setActiveStatementId}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">피드백 받기</CardTitle>
          <CardDescription>
            저장된 초안이 있어야 합니다. 목표 대학은 피드백 맥락용입니다(생기부에 없는 내용은
            추측하지 않습니다).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="ps-feedback-univ">피드백 기준 목표 대학 (선택)</Label>
            <select
              id="ps-feedback-univ"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={feedbackUniv}
              onChange={(e) => setFeedbackUniv(e.target.value)}
              disabled={feedbackLoading}
              aria-label="피드백 목표 대학"
            >
              <option value="">선택 안 함</option>
              {GUIDELINE_PLAN_UNIV_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => void runFeedback()}
            disabled={feedbackLoading || !activeStatementId}
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {feedbackLoading ? "응답 중…" : "피드백 받기"}
          </Button>
        </CardContent>
        {!activeStatementId ? (
          <CardContent className="text-muted-foreground pt-0 text-xs">
            위에서 초안을 저장하면 피드백을 요청할 수 있습니다.
          </CardContent>
        ) : null}
      </Card>

      <FeedbackView
        streamingText={streamingText}
        donePayload={donePayload}
        loading={feedbackLoading}
        errorBanner={feedbackError}
      />
    </div>
  );
}
