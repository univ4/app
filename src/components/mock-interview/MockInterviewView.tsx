"use client";

import { useCallback, useState } from "react";

import type { InterviewType } from "@/types/mockInterview";
import { InterviewHistory } from "@/components/mock-interview/InterviewHistory";
import { InterviewSession } from "@/components/mock-interview/InterviewSession";
import { InterviewSetup } from "@/components/mock-interview/InterviewSetup";

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

function flushQuestionsBuffer(
  buffer: string,
  onChunk: (text: string) => void,
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
      }
    } catch {
      /* skip */
    }
  }
  return rest;
}

export function MockInterviewView() {
  const [targetUniv, setTargetUniv] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("서류기반");
  const [questionsMarkdown, setQuestionsMarkdown] = useState("");
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryRefresh((n) => n + 1);
  }, []);

  const runQuestions = useCallback(async () => {
    if (questionsLoading) return;
    const u = targetUniv.trim();
    if (u.length === 0) return;

    setQuestionsError(null);
    setQuestionsMarkdown("");
    setQuestionsLoading(true);

    let res: Response;
    try {
      res = await fetch("/api/mock-interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          targetUniv: u,
          interviewType,
        }),
      });
    } catch {
      setQuestionsLoading(false);
      setQuestionsError("네트워크 오류로 요청을 보낼 수 없습니다.");
      return;
    }

    const ct = res.headers.get("content-type") ?? "";

    if (!res.ok || ct.includes("application/json")) {
      setQuestionsLoading(false);
      let msg = `요청 실패 (${res.status})`;
      try {
        const j = (await res.json()) as {
          error?: { code?: string; message?: string };
        };
        if (j?.error?.message) msg = j.error.message;
      } catch {
        /* keep */
      }
      setQuestionsError(msg);
      return;
    }

    if (!res.body) {
      setQuestionsLoading(false);
      setQuestionsError("응답 본문이 비어 있습니다.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = "";

    const appendChunk = (chunk: string) => {
      setQuestionsMarkdown((prev) => prev + chunk);
    };

    const drainTail = (tail: string) => {
      const t = tail.trim();
      if (!t) return;
      const parsed = parseSseBlock(t);
      if (!parsed || parsed.event !== "chunk") return;
      try {
        const j = JSON.parse(parsed.data) as { text?: string };
        if (typeof j.text === "string" && j.text.length > 0) appendChunk(j.text);
      } catch {
        /* ignore */
      }
    };

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        carry = flushQuestionsBuffer(carry, appendChunk);
      }
      carry += decoder.decode();
      drainTail(carry);
    } catch {
      setQuestionsError("스트림 처리 중 오류가 났습니다.");
    } finally {
      reader.releaseLock();
    }

    setQuestionsLoading(false);
  }, [interviewType, questionsLoading, targetUniv]);

  return (
    <div className="space-y-8">
      <InterviewSetup
        targetUniv={targetUniv}
        onTargetUnivChange={setTargetUniv}
        interviewType={interviewType}
        onInterviewTypeChange={setInterviewType}
        loading={questionsLoading}
        onGenerate={() => void runQuestions()}
      />

      {questionsError ? (
        <div
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          role="alert"
        >
          {questionsError}
        </div>
      ) : null}

      <InterviewSession
        targetUniv={targetUniv.trim() || "—"}
        interviewType={interviewType}
        questionsMarkdown={questionsMarkdown}
        questionsLoading={questionsLoading}
        onQuestionsConsumed={bumpHistory}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">이전 기록</h2>
        <InterviewHistory refreshToken={historyRefresh} />
      </div>
    </div>
  );
}
