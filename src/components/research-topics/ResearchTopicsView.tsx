"use client";

import { useCallback, useState } from "react";

import { ResearchTopicsForm } from "@/components/research-topics/ResearchTopicsForm";
import { ResearchTopicsResult } from "@/components/research-topics/ResearchTopicsResult";
import type { ResearchTopicsDonePayload } from "@/types/researchTopics";

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
  onDone: (payload: ResearchTopicsDonePayload) => void,
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
        const j = JSON.parse(parsed.data) as ResearchTopicsDonePayload;
        onDone(j);
      }
    } catch {
      /* skip malformed */
    }
  }
  return rest;
}

export function ResearchTopicsView() {
  const [targetUniv, setTargetUniv] = useState<string>("");
  const [targetDept, setTargetDept] = useState("");
  const [subject, setSubject] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [donePayload, setDonePayload] = useState<ResearchTopicsDonePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const runResearchTopics = useCallback(async () => {
    if (loading) return;
    const u = targetUniv.trim();
    if (u.length === 0) return;

    setErrorBanner(null);
    setStreamingText("");
    setDonePayload(null);
    setLoading(true);

    let res: Response;
    try {
      const body: Record<string, string | undefined> = { targetUniv: u };
      const d = targetDept.trim();
      const s = subject.trim();
      if (d.length > 0) body.targetDept = d;
      if (s.length > 0) body.subject = s;

      res = await fetch("/api/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
    } catch {
      setLoading(false);
      setErrorBanner("네트워크 오류로 요청을 보낼 수 없습니다.");
      return;
    }

    const ct = res.headers.get("content-type") ?? "";

    if (!res.ok || ct.includes("application/json")) {
      setLoading(false);
      let msg = `요청 실패 (${res.status})`;
      try {
        const j = (await res.json()) as {
          error?: { code?: string; message?: string };
        };
        if (j?.error?.message) msg = j.error.message;
      } catch {
        /* keep default */
      }
      setErrorBanner(msg);
      return;
    }

    if (!res.body) {
      setLoading(false);
      setErrorBanner("응답 본문이 비어 있습니다.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = "";
    const streamResult: { done: ResearchTopicsDonePayload | null } = { done: null };

    const appendChunk = (chunk: string) => {
      setStreamingText((prev) => prev + chunk);
    };

    const onDone = (p: ResearchTopicsDonePayload) => {
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
          onDone(JSON.parse(parsed.data) as ResearchTopicsDonePayload);
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
      setErrorBanner("스트림 처리 중 오류가 났습니다.");
    } finally {
      reader.releaseLock();
    }

    setDonePayload(streamResult.done);
    setLoading(false);
  }, [loading, subject, targetDept, targetUniv]);

  return (
    <div className="space-y-6">
      <ResearchTopicsForm
        targetUniv={targetUniv}
        onTargetUnivChange={setTargetUniv}
        targetDept={targetDept}
        onTargetDeptChange={setTargetDept}
        subject={subject}
        onSubjectChange={setSubject}
        loading={loading}
        onStart={() => void runResearchTopics()}
      />

      {errorBanner ? (
        <div
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
          role="alert"
        >
          {errorBanner}
        </div>
      ) : null}

      <ResearchTopicsResult
        streamingText={streamingText}
        donePayload={donePayload}
        loading={loading}
      />
    </div>
  );
}
