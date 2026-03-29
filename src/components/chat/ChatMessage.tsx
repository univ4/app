"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatCitation } from "@/types/chat";

export type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  /** 스트리밍 중 말풍선(커서·레이아웃) */
  streaming?: boolean;
  /** 관련 청크 없음·API `no_context` 등 */
  unavailable?: boolean;
};

function isUnavailableText(text: string): boolean {
  const t = text.trim();
  return t === "확인 불가" || t.startsWith("확인 불가\n") || t.startsWith("확인 불가 ");
}

export function ChatMessage({
  role,
  content,
  citations = [],
  streaming,
  unavailable: unavailableProp,
}: ChatMessageProps) {
  const citeId = useId();
  const [citeOpen, setCiteOpen] = useState(false);
  const isUser = role === "user";
  const unavailable =
    unavailableProp ||
    (!isUser && isUnavailableText(content) && citations.length === 0);

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl px-3.5 py-2.5 text-sm break-words shadow-sm sm:px-4 sm:py-3 sm:text-[0.9375rem]",
          isUser && "bg-primary text-primary-foreground",
          !isUser &&
            !unavailable &&
            "bg-card text-card-foreground border border-border",
          !isUser &&
            unavailable &&
            "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-50",
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {streaming ? (
          <span
            className={cn(
              "mt-1 inline-block h-3 w-0.5 animate-pulse rounded-sm align-middle",
              isUser ? "bg-primary-foreground/70" : "bg-muted-foreground/60",
            )}
            aria-hidden
          />
        ) : null}

        {!isUser && citations.length > 0 ? (
          <div className="mt-3 border-t border-border/60 pt-2 dark:border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2 h-8 gap-1 px-2 text-xs font-medium"
              aria-expanded={citeOpen}
              aria-controls={citeId}
              onClick={() => setCiteOpen((o) => !o)}
            >
              출처 {citations.length}건
              {citeOpen ? (
                <ChevronUp className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5 shrink-0" aria-hidden />
              )}
            </Button>
            {citeOpen ? (
              <ul
                id={citeId}
                className="text-muted-foreground mt-1 list-disc space-y-1.5 pl-4 text-xs sm:text-sm"
              >
                {citations.map((c, i) => (
                  <li key={`${c.chunk_id}-${i}-${c.citation_hint}`} className="break-words">
                    <span className="text-foreground font-medium">
                      {c.university_name}
                      {c.admission_year > 0 ? ` · ${c.admission_year}학년도` : ""}
                      {c.admission_type ? ` · ${c.admission_type}` : ""}
                    </span>
                    {c.page_section ? (
                      <span className="block text-[0.7rem] opacity-90 sm:text-xs">
                        {c.page_section}
                      </span>
                    ) : null}
                    <span className="block font-mono text-[0.65rem] opacity-80 sm:text-xs">
                      {c.citation_hint}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
