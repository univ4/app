"use client";

import { SendHorizontal } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { CHAT_EXAMPLE_QUESTIONS } from "@/lib/chat/guidelineUnivOptions";
import type { ChatCitation, ChatDonePayload } from "@/types/chat";

import { ChatMessage } from "./ChatMessage";
import { UnivFilter } from "./UnivFilter";

type ChatRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  streaming?: boolean;
  unavailable?: boolean;
};

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
  onDone: (payload: ChatDonePayload) => void,
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
        const j = JSON.parse(parsed.data) as ChatDonePayload;
        onDone(j);
      }
    } catch {
      /* skip malformed */
    }
  }
  return rest;
}

export function ChatInterface() {
  const [univName, setUnivName] = useState("");
  const [year, setYear] = useState("2027");
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;

      setErrorBanner(null);
      setSending(true);

      const userId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: text },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
          citations: [],
        },
      ]);
      setInput("");
      scrollToBottom();

      const body: Record<string, unknown> = { message: text };
      const u = univName.trim();
      if (u.length > 0) body.univName = u;
      const y = year.trim();
      if (y.length > 0) {
        const n = Number.parseInt(y, 10);
        if (Number.isFinite(n)) body.year = n;
      }

      let res: Response;
      try {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
      } catch {
        setSending(false);
        setErrorBanner("네트워크 오류로 요청을 보낼 수 없습니다.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                  streaming: false,
                  unavailable: false,
                }
              : m,
          ),
        );
        return;
      }

      const ct = res.headers.get("content-type") ?? "";

      if (!res.ok || ct.includes("application/json")) {
        setSending(false);
        let msg = `요청 실패 (${res.status})`;
        try {
          const j = (await res.json()) as {
            error?: { code?: string; message?: string };
          };
          if (j?.error?.message) msg = j.error.message;
          if (j?.error?.code === "RATE_LIMIT") {
            msg = j.error.message ?? msg;
          }
        } catch {
          /* keep default */
        }
        setErrorBanner(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: msg,
                  streaming: false,
                  unavailable: false,
                  citations: [],
                }
              : m,
          ),
        );
        return;
      }

      if (!res.body) {
        setSending(false);
        setErrorBanner("응답 본문이 비어 있습니다.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "응답을 읽을 수 없습니다.", streaming: false }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      const streamResult: { done: ChatDonePayload | null } = { done: null };

      const appendChunk = (chunk: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk, streaming: true }
              : m,
          ),
        );
        scrollToBottom();
      };

      const onDone = (p: ChatDonePayload) => {
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
            onDone(JSON.parse(parsed.data) as ChatDonePayload);
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

      const fr = streamResult.done?.finish_reason;
      const citations = streamResult.done?.citations ?? [];
      const unavailable = fr === "no_context";

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                streaming: false,
                citations,
                unavailable,
              }
            : m,
        ),
      );
      setSending(false);
      scrollToBottom();
      textareaRef.current?.focus();
    },
    [sending, univName, year, scrollToBottom],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const showEmptyHints = messages.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col md:min-h-[calc(100dvh-5rem)]">
      <UnivFilter
        univName={univName}
        year={year}
        onUnivNameChange={setUnivName}
        onYearChange={setYear}
        disabled={sending}
      />

      {errorBanner ? (
        <ErrorState message={errorBanner} variant="banner" />
      ) : null}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2 pb-4"
      >
        {showEmptyHints ? (
          <div className="text-muted-foreground mx-auto max-w-2xl space-y-3 px-1 py-4 text-sm">
            <p className="text-heading text-foreground">잘 맞는 질문 예시 (매뉴얼 §12)</p>
            <p className="text-body">아래를 누르면 입력창에 채워집니다. 필요하면 고친 뒤 전송하세요.</p>
            <ul className="flex flex-col gap-2">
              {CHAT_EXAMPLE_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    disabled={sending}
                    className="text-body hover:bg-muted border-border text-foreground w-full rounded-lg border bg-card px-3 py-2.5 text-left break-words transition-colors disabled:opacity-50"
                    onClick={() => {
                      setInput(q);
                      textareaRef.current?.focus();
                    }}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            role={m.role}
            content={m.content}
            citations={m.citations}
            streaming={m.streaming}
            unavailable={m.unavailable}
          />
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky z-10 mt-auto border-t border-border pt-3 pb-1 backdrop-blur-sm max-md:bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            name="message"
            rows={2}
            maxLength={12000}
            placeholder="전형계획·정시 자료 범위에서 질문해 주세요…"
            className="text-body border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring max-h-40 min-h-11 w-full flex-1 resize-y rounded-md border px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={input}
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            aria-label="챗봇 질문 입력"
          />
          <Button
            type="submit"
            className="min-h-11 w-full shrink-0 sm:w-auto sm:min-w-[6.5rem]"
            disabled={sending || !input.trim()}
          >
            <SendHorizontal className="mr-1.5 size-4" aria-hidden />
            전송
          </Button>
        </div>
        <p className="text-caption mt-2">
          자료에 없는 내용은 「확인 불가」로 답할 수 있습니다. 수치·환산은 분석·성적 메뉴를 이용하세요.
        </p>
      </form>
    </div>
  );
}
