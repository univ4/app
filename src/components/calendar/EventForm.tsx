"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";

import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";
import { CALENDAR_EVENT_TYPES } from "@/lib/calendar/calendarApiTypes";
import {
  calendarEventInsertSchema,
  type CalendarEventInsertInput,
} from "@/lib/calendar/calendarZod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ALERT_OPTIONS = [30, 14, 7, 3, 1, 0] as const;

export interface EventFormProps {
  mode: "create" | "edit";
  initial?: CalendarEventRow | null;
  onSuccess: () => Promise<void> | void;
  onCancel: () => void;
}

export function EventForm({ mode, initial, onSuccess, onCancel }: EventFormProps) {
  const form = useForm<CalendarEventInsertInput>({
    resolver: zodResolver(calendarEventInsertSchema),
    defaultValues: {
      title: initial?.title ?? "",
      event_date: initial?.event_date ?? "",
      event_type: initial?.event_type ?? "기타",
      university: initial?.university ?? null,
      alert_days: initial?.alert_days?.length ? initial.alert_days : [7, 3, 1, 0],
      note: initial?.note ?? null,
    },
  });

  React.useEffect(() => {
    if (initial && mode === "edit") {
      form.reset({
        title: initial.title,
        event_date: initial.event_date,
        event_type: initial.event_type,
        university: initial.university,
        alert_days: initial.alert_days?.length ? initial.alert_days : [7, 3, 1, 0],
        note: initial.note,
      });
    }
  }, [initial, mode, form]);

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const alertDays = form.watch("alert_days");

  const toggleAlertDay = (d: number, current: number[]) => {
    if (current.includes(d)) {
      return current.filter((x) => x !== d).sort((a, b) => b - a);
    }
    return [...current, d].sort((a, b) => b - a);
  };

  async function onSubmit(values: CalendarEventInsertInput) {
    setSubmitError(null);
    setPending(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = (await res.json()) as {
          error: { message?: string } | null;
        };
        if (!res.ok) {
          setSubmitError(json.error?.message ?? "저장에 실패했습니다.");
          return;
        }
      } else if (initial) {
        const res = await fetch(`/api/calendar/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = (await res.json()) as {
          error: { message?: string } | null;
        };
        if (!res.ok) {
          setSubmitError(json.error?.message ?? "수정에 실패했습니다.");
          return;
        }
      }
      await onSuccess();
    } finally {
      setPending(false);
    }
  }

  const titleErr = form.formState.errors.title?.message;
  const dateErr = form.formState.errors.event_date?.message;
  const typeErr = form.formState.errors.event_type?.message;
  const alertErr = form.formState.errors.alert_days?.message;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">
        {mode === "create" ? "일정 추가" : "일정 수정"}
      </h2>
      <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cal-title">제목</Label>
          <Input id="cal-title" placeholder="예: 논술 고사일" {...form.register("title")} />
          {titleErr ? (
            <p className="text-destructive text-sm" role="alert">
              {titleErr}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cal-date">날짜</Label>
          <Input
            id="cal-date"
            type="date"
            autoComplete="off"
            {...form.register("event_date")}
          />
          {dateErr ? (
            <p className="text-destructive text-sm" role="alert">
              {dateErr}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cal-type">유형</Label>
          <select
            id="cal-type"
            className={cn(
              "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm shadow-xs sm:h-9 sm:min-h-9",
            )}
            {...form.register("event_type")}
          >
            {CALENDAR_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {typeErr ? (
            <p className="text-destructive text-sm" role="alert">
              {typeErr}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cal-univ">대학 (선택)</Label>
          <Input
            id="cal-univ"
            placeholder="예: 서강대"
            {...form.register("university")}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">알림 시점 (일 전)</span>
          <div className="flex flex-wrap gap-2">
            {ALERT_OPTIONS.map((d) => {
              const on = alertDays.includes(d);
              return (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={on ? "default" : "outline"}
                  onClick={() =>
                    form.setValue("alert_days", toggleAlertDay(d, alertDays), {
                      shouldValidate: true,
                    })
                  }
                >
                  D-{d === 0 ? "Day" : d}
                </Button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">최소 한 개 이상 선택하세요.</p>
          {alertErr ? (
            <p className="text-destructive text-sm" role="alert">
              {alertErr}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cal-note">메모 (선택)</Label>
          <Input id="cal-note" placeholder="추가 안내" {...form.register("note")} />
        </div>

        {submitError ? (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : mode === "create" ? "추가" : "저장"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            취소
          </Button>
        </div>
      </Form>
    </div>
  );
}
