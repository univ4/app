import { z } from "zod";

export const MAX_RECORD_TEXT = 3000;

const gradeSchema = z.coerce.number().int().min(1).max(3);
const semesterSchema = z.coerce.number().int().min(1).max(2);

const trimmedNote = z
  .string()
  .max(MAX_RECORD_TEXT)
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, "내용을 입력하세요.");

export const subjectNotePostSchema = z.object({
  grade: gradeSchema,
  semester: semesterSchema,
  subject_name: z.string().trim().min(1).max(200),
  note: trimmedNote,
});

export const subjectNotePutSchema = z.object({
  grade: gradeSchema.optional(),
  semester: semesterSchema.optional(),
  subject_name: z.string().trim().min(1).max(200).optional(),
  note: z
    .string()
    .max(MAX_RECORD_TEXT)
    .transform((s) => s.trim())
    .optional(),
});

export const activityTypeSchema = z.enum(["자율활동", "동아리활동", "진로활동"]);

export const activityPostSchema = z.object({
  grade: gradeSchema,
  activity_type: activityTypeSchema,
  hours: z.coerce.number().int().min(0).max(9999).nullable().optional(),
  hope_field: z.string().trim().max(500).nullable().optional(),
  content: trimmedNote,
});

export const activityPutSchema = z.object({
  grade: gradeSchema.optional(),
  activity_type: activityTypeSchema.optional(),
  hours: z.coerce.number().int().min(0).max(9999).nullable().optional(),
  hope_field: z.string().trim().max(500).nullable().optional(),
  content: z
    .string()
    .max(MAX_RECORD_TEXT)
    .transform((s) => s.trim())
    .optional(),
});

export const awardPostSchema = z.object({
  grade: gradeSchema,
  semester: semesterSchema,
  award_name: z.string().trim().min(1).max(300),
  rank: z.string().trim().max(100).nullable().optional(),
  award_date: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional(),
  organization: z.string().trim().max(300).nullable().optional(),
  participants: z.string().trim().max(300).nullable().optional(),
});

export const awardPutSchema = awardPostSchema
  .partial()
  .extend({
    award_date: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
      .optional(),
  });

export const behaviorPutSchema = z.object({
  grade: gradeSchema,
  content: trimmedNote,
});

const nonNegCount = z.coerce.number().int().min(0).max(9999);

export const attendancePutSchema = z.object({
  grade: gradeSchema,
  school_days: z.union([z.coerce.number().int().min(0).max(366), z.null()]).optional(),
  absence_illness: nonNegCount.optional().default(0),
  absence_unauthorized: nonNegCount.optional().default(0),
  absence_other: nonNegCount.optional().default(0),
  late_illness: nonNegCount.optional().default(0),
  late_unauthorized: nonNegCount.optional().default(0),
  late_other: nonNegCount.optional().default(0),
  early_leave_illness: nonNegCount.optional().default(0),
  early_leave_unauthorized: nonNegCount.optional().default(0),
  early_leave_other: nonNegCount.optional().default(0),
  result_illness: nonNegCount.optional().default(0),
  result_unauthorized: nonNegCount.optional().default(0),
  result_other: nonNegCount.optional().default(0),
  note: z.string().max(5000).nullable().optional(),
});

export const volunteerPostSchema = z.object({
  grade: gradeSchema,
  period: z.string().trim().min(1).max(500),
  organization: z.string().trim().min(1).max(500),
  activity: z.string().trim().min(1).max(2000),
  hours: z.coerce.number().int().min(0).max(99999),
});

export const readingPostSchema = z.object({
  grade: gradeSchema,
  subject_area: z.string().max(200).nullable().optional(),
  content: trimmedNote,
});

export const certTypeSchema = z.enum(["자격증", "인증"]);

export const certificatePostSchema = z.object({
  cert_type: certTypeSchema,
  cert_name: z.string().trim().min(1).max(300),
  cert_number: z.string().max(200).nullable().optional(),
  acquired_date: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional(),
  issuer: z.string().max(300).nullable().optional(),
});

export const schoolViolencePostSchema = z.object({
  grade: gradeSchema,
  decision_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action_detail: z
    .string()
    .max(MAX_RECORD_TEXT)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, "조치사항을 입력하세요."),
});
