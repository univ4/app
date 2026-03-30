import type { CalendarEventRow } from "@/lib/calendar/calendarApiTypes";

import { calcDDay } from "./calcDDay";

export type AdmissionTodoCategory = "confirm" | "prepare" | "submit" | "check";

export interface AdmissionTodoItem {
  timing: string;
  task: string;
  category: AdmissionTodoCategory;
}

export interface CalcAdmissionTodosParams {
  targetDate: string;
  eventType: string;
  dday: number;
}

export interface CalcAdmissionTodosResult {
  todos: AdmissionTodoItem[];
}

export interface CalendarAdmissionTodoRow extends AdmissionTodoItem {
  event_id: string;
  event_title: string;
  event_date: string;
  event_type: string;
  dday: number;
  dday_label: string;
}

type TemplateRow = {
  offset: number;
  task: string;
  category: AdmissionTodoCategory;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const TEMPLATE_WONSEO: TemplateRow[] = [
  { offset: 30, task: "목표 대학 최종 6장 결정", category: "prepare" },
  { offset: 14, task: "자기소개서 초안 완성", category: "prepare" },
  { offset: 7, task: "수능최저 기준 과목별 목표 등급 재확인", category: "confirm" },
  { offset: 3, task: "원서접수 사이트 사전 가입/로그인 확인", category: "check" },
  { offset: 1, task: "원서 최종 점검 및 제출 준비", category: "submit" },
];

const TEMPLATE_SUNEUNG: TemplateRow[] = [
  { offset: 30, task: "취약 영역 집중 학습 계획 수립", category: "prepare" },
  { offset: 14, task: "실전 모의고사 2회 이상 응시", category: "prepare" },
  { offset: 7, task: "수험표 출력 및 고사장 위치 확인", category: "check" },
  { offset: 3, task: "준비물 점검 (수험표, 신분증, 수정테이프 등)", category: "check" },
  { offset: 1, task: "충분한 수면, 다음날 준비물 최종 확인", category: "confirm" },
];

const TEMPLATE_JEONGSI: TemplateRow[] = [
  { offset: 14, task: "환산점수 계산 및 지원 대학 목록 확정", category: "prepare" },
  { offset: 7, task: "정시 원서접수 사이트 사전 확인", category: "check" },
  { offset: 3, task: "군별(가/나/다) 지원 조합 최종 결정", category: "confirm" },
  { offset: 1, task: "원서 최종 점검", category: "submit" },
];

function templateForEventType(eventType: string): TemplateRow[] | null {
  switch (eventType) {
    case "원서접수":
      return TEMPLATE_WONSEO;
    case "수능":
      return TEMPLATE_SUNEUNG;
    case "정시":
      return TEMPLATE_JEONGSI;
    default:
      return null;
  }
}

function timingLabel(offset: number): string {
  return `D-${offset}`;
}

/**
 * 일정까지 남은 일수(dday)에 따라 역산 TO-DO를 반환한다.
 * 마일스톤 오프셋 o는 `o <= max(dday, 1)` 일 때만 포함한다(이미 지난 단계는 제외, D-Day 당일은 D-1 항목만 유지).
 */
export function calcAdmissionTodos(params: CalcAdmissionTodosParams): CalcAdmissionTodosResult {
  const { targetDate, eventType, dday } = params;

  if (!ISO_DATE.test(targetDate)) {
    throw new Error("ValidationError: targetDate must be YYYY-MM-DD.");
  }

  if (!Number.isFinite(dday)) {
    throw new Error("ValidationError: dday must be a finite number.");
  }

  if (dday < 0) {
    return { todos: [] };
  }

  const template = templateForEventType(eventType);
  if (!template) {
    return { todos: [] };
  }

  const cutoff = Math.max(dday, 1);
  const todos: AdmissionTodoItem[] = template
    .filter((row) => row.offset <= cutoff)
    .map((row) => ({
      timing: timingLabel(row.offset),
      task: row.task,
      category: row.category,
    }));

  return { todos };
}

const SUPPORTED_EVENT_TYPES = new Set(["원서접수", "수능", "정시"]);

/**
 * 캘린더 일정 목록에서 역산 TO-DO를 합친다(이벤트 날짜 오름차순).
 */
export function aggregateAdmissionTodosFromCalendarEvents(
  events: readonly Pick<CalendarEventRow, "id" | "title" | "event_date" | "event_type">[],
): CalendarAdmissionTodoRow[] {
  const rows: CalendarAdmissionTodoRow[] = [];
  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));

  for (const e of sorted) {
    if (!SUPPORTED_EVENT_TYPES.has(e.event_type)) continue;

    const { dday, label } = calcDDay(e.event_date);
    const { todos } = calcAdmissionTodos({
      targetDate: e.event_date,
      eventType: e.event_type,
      dday,
    });

    for (const t of todos) {
      rows.push({
        ...t,
        event_id: e.id,
        event_title: e.title,
        event_date: e.event_date,
        event_type: e.event_type,
        dday,
        dday_label: label,
      });
    }
  }

  return rows;
}
