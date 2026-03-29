export const CALENDAR_EVENT_TYPES = [
  "원서접수",
  "수능",
  "정시",
  "면접",
  "논술",
  "기타",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export interface CalendarEventRow {
  id: string;
  student_id: string;
  title: string;
  event_date: string;
  event_type: CalendarEventType;
  university: string | null;
  alert_days: number[];
  note: string | null;
  created_at: string;
}
