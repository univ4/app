"use client";

import { addMonths } from "date-fns";
import * as React from "react";
import { useRouter } from "next/navigation";

import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import type { CalendarAdmissionTodoRow } from "@/lib/calculators/calcAdmissionTodos";
import { calcDDay } from "@/lib/calculators/calcDDay";
import { TodoList } from "@/components/calendar/TodoList";
import { CalendarView, CalendarEventList } from "@/components/calendar/CalendarView";
import { EventForm } from "@/components/calendar/EventForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface CalendarPageClientProps {
  initialItems: CalendarEventRow[];
  initialTodos: CalendarAdmissionTodoRow[];
  isAdmin: boolean;
}

export function CalendarPageClient({ initialItems, initialTodos, isAdmin }: CalendarPageClientProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<CalendarEventRow[]>(initialItems);
  const [todoItems, setTodoItems] = React.useState<CalendarAdmissionTodoRow[]>(initialTodos);
  const [month, setMonth] = React.useState(() => new Date());
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState<"create" | "edit" | null>(null);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  React.useEffect(() => {
    setTodoItems(initialTodos);
  }, [initialTodos]);

  async function refreshFromApi() {
    const [calRes, todoRes] = await Promise.all([
      fetch("/api/calendar"),
      fetch("/api/calendar/todos"),
    ]);
    const calJson = (await calRes.json()) as {
      data: { items: CalendarEventRow[] } | null;
    };
    const todoJson = (await todoRes.json()) as {
      data: { todos: CalendarAdmissionTodoRow[] } | null;
    };
    if (calJson.data?.items) {
      setItems(calJson.data.items);
    }
    if (todoJson.data?.todos) {
      setTodoItems(todoJson.data.todos);
    }
    router.refresh();
  }

  const selected = items.find((e) => e.id === selectedId) ?? null;

  async function handleDelete() {
    if (!selected || !isAdmin) return;
    if (!window.confirm("이 일정을 삭제할까요?")) return;
    const res = await fetch(`/api/calendar/${selected.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setSelectedId(null);
    setFormOpen(null);
    await refreshFromApi();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>역산 TO-DO</CardTitle>
          <CardDescription>
            등록된 일정(원서접수·수능·정시)을 기준으로 오늘 날짜에 맞춰 할 일을 골라 보여 줍니다. 완료 표시는 이
            기기에만 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TodoList
            items={todoItems}
            numbered
            showHeading={false}
            className="border-0 p-0"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">월별 캘린더</h2>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 sm:min-h-7 sm:flex-none"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                이전 달
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 flex-1 sm:min-h-7 sm:flex-none"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                다음 달
              </Button>
            </div>
          </div>
          <CalendarView
            events={items}
            month={month}
            onMonthChange={setMonth}
            selectedEventId={selectedId}
            onSelectEvent={setSelectedId}
          />
        </div>

        <CalendarEventList
          events={items}
          selectedEventId={selectedId}
          onSelectEvent={setSelectedId}
        />
      </div>

      {selected ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-lg">{selected.title}</CardTitle>
              <CardDescription>
                {calcDDay(selected.event_date).label} · {selected.event_date} ·{" "}
                {selected.event_type}
                {selected.university ? ` · ${selected.university}` : ""}
              </CardDescription>
            </div>
            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormOpen("edit")}
                >
                  수정
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={handleDelete}>
                  삭제
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {selected.note ? <p>{selected.note}</p> : null}
            <p className="text-muted-foreground">
              알림 시점:{" "}
              {selected.alert_days
                .slice()
                .sort((a, b) => b - a)
                .map((d) => (d === 0 ? "D-Day" : `D-${d}`))
                .join(", ")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <div className="space-y-4">
          {formOpen === null ? (
            <Button type="button" onClick={() => setFormOpen("create")}>
              일정 추가
            </Button>
          ) : null}

          {formOpen === "create" ? (
            <EventForm
              mode="create"
              onCancel={() => setFormOpen(null)}
              onSuccess={async () => {
                setFormOpen(null);
                await refreshFromApi();
              }}
            />
          ) : null}

          {formOpen === "edit" && selected ? (
            <EventForm
              mode="edit"
              initial={selected}
              onCancel={() => setFormOpen(null)}
              onSuccess={async () => {
                setFormOpen(null);
                await refreshFromApi();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
