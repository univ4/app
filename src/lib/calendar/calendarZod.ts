import { z } from "zod";

const eventTypeSchema = z.enum([
  "원서접수",
  "수능",
  "정시",
  "면접",
  "논술",
  "기타",
]);

export const calendarEventInsertSchema = z.object({
  title: z.string().trim().min(1).max(500),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_type: eventTypeSchema,
  university: z.string().trim().max(200).nullable().optional(),
  alert_days: z.array(z.number().int().min(0).max(365)).min(1).max(20),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const calendarEventUpdateSchema = calendarEventInsertSchema.partial();

export type CalendarEventInsertInput = z.infer<typeof calendarEventInsertSchema>;
export type CalendarEventUpdateInput = z.infer<typeof calendarEventUpdateSchema>;
