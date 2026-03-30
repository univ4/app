"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";
import type { HakjongAnalyzeDonePayload, HakjongSection } from "@/types/hakjong";

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
  onDone: (payload: HakjongAnalyzeDonePayload) => void,
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
        const j = JSON.parse(parsed.data) as HakjongAnalyzeDonePayload;
        onDone(j);
      }
    } catch {
      /* skip malformed */
    }
  }
  return rest;
}

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

const SECTION_ORDER: { key: HakjongSection["key"]; label: string }[] = [
  { key: "academic", label: "학업역량" },
  { key: "career", label: "진로역량" },
  { key: "community", label: "공동체역량" },
];

export function HakjongAnalysisView() {
  const [targetUniv, setTargetUniv] = useState<string>("");
  const [streamingText, setStreamingText] = useState("");
  const [donePayload, setDonePayload] = useState<HakjongAnalyzeDonePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const runAnalyze = useCallback(async () => {
    if (loading) return;
    setErrorBanner(null);
    setStreamingText("");
    setDonePayload(null);
    setLoading(true);

    const body: Record<string, unknown> = {};
    const u = targetUniv.trim();
    if (u.length > 0) body.targetUniv = u;

    let res: Response;
    try {
      res = await fetch("/api/student-record/analyze", {
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
    const streamResult: { done: HakjongAnalyzeDonePayload | null } = { done: null };

    const appendChunk = (chunk: string) => {
      setStreamingText((prev) => prev + chunk);
    };

    const onDone = (p: HakjongAnalyzeDonePayload) => {
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
          onDone(JSON.parse(parsed.data) as HakjongAnalyzeDonePayload);
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
  }, [loading, targetUniv]);

  const sectionsFromDone = donePayload?.sections ?? [];
  const sectionByKey = new Map(
    sectionsFromDone.map((s) => [s.key, s] as const),
  );
  const showStructured = sectionsFromDone.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">분석 설정</CardTitle>
          <CardDescription>
            적재된 생활기록부 청크(`student_record_chunks`)만 근거로 분석합니다. 목표 대학은
            맥락 참고용이며, 생기부에 없는 내용은 추측하지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="hakjong-target-univ">목표 대학 (선택)</Label>
            <select
              id="hakjong-target-univ"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={targetUniv}
              onChange={(e) => setTargetUniv(e.target.value)}
              disabled={loading}
              aria-label="목표 대학 선택"
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
            onClick={() => void runAnalyze()}
            disabled={loading}
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {loading ? "분석 중…" : "분석 시작"}
          </Button>
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
          <h2 className="text-foreground text-lg font-semibold">역량별 정리</h2>
          <div className="grid gap-4 md:grid-cols-1">
            {SECTION_ORDER.map(({ key, label }) => {
              const sec = sectionByKey.get(key);
              return (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    {sec?.content
                      ? renderSectionBody(sec.content)
                      : "이 역량 블록을 파싱하지 못했습니다. 위 스트리밍 텍스트를 확인하세요."}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {donePayload?.finish_reason === "no_context" && streamingText.length > 0 && (
        <p className="text-muted-foreground text-xs">
          적재된 청크가 없어 안내 메시지만 표시되었습니다.
        </p>
      )}
    </div>
  );
}
