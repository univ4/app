"use client";

import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileEdit,
  ListChecks,
  Send,
} from "lucide-react";
import * as React from "react";

import type {
  AdmissionTodoCategory,
  CalendarAdmissionTodoRow,
} from "@/lib/calculators/calcAdmissionTodos";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "univ4_admission_todo_done_v1";

function todoStorageId(row: CalendarAdmissionTodoRow): string {
  return `${row.event_id}:${row.timing}:${row.task}`;
}

function loadDoneMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveDoneMap(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function categoryIcon(category: AdmissionTodoCategory) {
  switch (category) {
    case "confirm":
      return ClipboardCheck;
    case "prepare":
      return FileEdit;
    case "submit":
      return Send;
    case "check":
      return ListChecks;
  }
}

export interface TodoListProps {
  items: CalendarAdmissionTodoRow[];
  title?: string;
  description?: string;
  className?: string;
  /** 네 번호 목록(매뉴얼 §13) */
  numbered?: boolean;
  /** false면 상단 제목·설명 블록을 숨긴다(카드 헤더와 중복 방지). */
  showHeading?: boolean;
}

export function TodoList({
  items,
  title = "이번 주 할 일",
  description,
  className,
  numbered = true,
  showHeading = true,
}: TodoListProps) {
  const [done, setDone] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setDone(loadDoneMap());
  }, []);

  const toggle = React.useCallback((id: string, next: boolean) => {
    setDone((prev) => {
      const merged = { ...prev, [id]: next };
      saveDoneMap(merged);
      return merged;
    });
  }, []);

  if (items.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed bg-muted/30 p-4 text-sm", className)}>
        {showHeading ? <p className="font-medium text-foreground">{title}</p> : null}
        <p className={cn("text-muted-foreground", showHeading && "mt-1")}>
          표시할 역산 TO-DO가 없습니다. 다가오는 원서접수·수능·정시 일정이 있으면 자동으로 채워집니다.
        </p>
      </div>
    );
  }

  const ListTag = numbered ? "ol" : "ul";
  const listClass = numbered ? "list-decimal space-y-3 pl-5" : "space-y-3";

  return (
    <div className={cn("space-y-3", className)}>
      {showHeading ? (
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          ) : null}
        </div>
      ) : null}
      <ListTag className={listClass}>
        {items.map((row) => {
          const id = todoStorageId(row);
          const isDone = Boolean(done[id]);
          const Icon = categoryIcon(row.category);
          return (
            <li key={id} className="text-sm">
              <div className="flex gap-3 rounded-md border border-transparent py-1 pr-1 hover:border-border/80">
                <button
                  type="button"
                  onClick={() => toggle(id, !isDone)}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-pressed={isDone}
                  aria-label={isDone ? "완료 취소" : "완료로 표시"}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-5 text-primary" aria-hidden />
                  ) : (
                    <Circle className="size-5" aria-hidden />
                  )}
                </button>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={cn(
                        "font-mono text-xs text-muted-foreground",
                        isDone && "line-through opacity-70",
                      )}
                    >
                      {row.dday_label} · {row.timing}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <Icon className="size-3.5 shrink-0" aria-hidden />
                      {row.event_title}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-foreground leading-snug",
                      isDone && "text-muted-foreground line-through",
                    )}
                  >
                    {row.task}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ListTag>
    </div>
  );
}
