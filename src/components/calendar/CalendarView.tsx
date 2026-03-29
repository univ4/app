"use client";

import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import * as React from "react";

import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { calcDDay } from "@/lib/calculators/calcDDay";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface CalendarViewProps {
  events: CalendarEventRow[];
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
}

function eventsOnDate(events: CalendarEventRow[], d: Date): CalendarEventRow[] {
  const key = format(d, "yyyy-MM-dd");
  return events.filter((e) => e.event_date === key);
}

export function CalendarView({
  events,
  month,
  onMonthChange,
  selectedEventId,
  onSelectEvent,
}: CalendarViewProps) {
  const eventDates = React.useMemo(
    () => events.map((e) => parse(e.event_date, "yyyy-MM-dd", new Date())),
    [events],
  );

  const selected = React.useMemo(() => {
    if (!selectedEventId) return undefined;
    const ev = events.find((e) => e.id === selectedEventId);
    return ev ? parse(ev.event_date, "yyyy-MM-dd", new Date()) : undefined;
  }, [events, selectedEventId]);

  return (
    <div className="space-y-4">
      <Calendar
        locale={ko}
        mode="single"
        month={month}
        onMonthChange={onMonthChange}
        selected={selected}
        onSelect={(d) => {
          if (!d) {
            onSelectEvent(null);
            return;
          }
          const onDay = eventsOnDate(events, d);
          if (onDay.length === 1) {
            onSelectEvent(onDay[0].id);
          } else if (onDay.length > 1) {
            onSelectEvent(onDay[0].id);
          } else {
            onSelectEvent(null);
          }
        }}
        modifiers={{ hasEvent: eventDates }}
        modifiersClassNames={{
          hasEvent: cn(
            "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
          ),
        }}
        className="w-full max-w-full rounded-lg border bg-card p-2 shadow-sm [--cell-size:2.75rem] sm:[--cell-size:1.75rem]"
      />

      {selectedEventId ? (
        <DayEventHint
          events={events}
          selectedEventId={selectedEventId}
          onPick={onSelectEvent}
        />
      ) : null}
    </div>
  );
}

function DayEventHint({
  events,
  selectedEventId,
  onPick,
}: {
  events: CalendarEventRow[];
  selectedEventId: string;
  onPick: (id: string | null) => void;
}) {
  const ev = events.find((e) => e.id === selectedEventId);
  if (!ev) return null;
  const sameDay = events.filter((e) => e.event_date === ev.event_date);
  if (sameDay.length <= 1) return null;

  return (
    <div className="text-muted-foreground text-sm">
      <p className="mb-2 font-medium text-foreground">이 날짜의 다른 일정</p>
      <ul className="flex flex-wrap gap-2">
        {sameDay.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors sm:min-h-0 sm:px-2 sm:py-1 sm:text-xs",
                e.id === selectedEventId
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted",
              )}
              onClick={() => onPick(e.id)}
            >
              {e.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CalendarEventList({
  events,
  selectedEventId,
  onSelectEvent,
}: {
  events: CalendarEventRow[];
  selectedEventId: string | null;
  onSelectEvent: (id: string | null) => void;
}) {
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events],
  );

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">오늘 기준 주요 일정</h2>
        <p className="text-muted-foreground text-xs">
          D-Day는 오늘(기기 로컬 날짜) 기준입니다.
        </p>
      </div>
      <ul className="divide-y">
        {sorted.map((e) => {
          const { label } = calcDDay(e.event_date);
          const active = e.id === selectedEventId;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(active ? null : e.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                  active ? "bg-muted/80" : "hover:bg-muted/50",
                )}
              >
                <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
                  {label}
                </span>
                <span className="min-w-0 flex-1 font-medium">{e.title}</span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {e.event_date}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
