import { z } from "zod";

export const NEIS_SEMESTERS = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"] as const;
export type NeisSemester = (typeof NEIS_SEMESTERS)[number];

export const SUBJECT_CATEGORIES = ["general", "career_choice", "pe_art"] as const;
export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number];

/** 학기 → 정렬용 exam_date (고1~고3 학기 순서 보존) */
export const NEIS_SEMESTER_TO_EXAM_DATE: Record<NeisSemester, string> = {
  "1-1": "2001-03-01",
  "1-2": "2001-08-01",
  "2-1": "2002-03-01",
  "2-2": "2002-08-01",
  "3-1": "2003-03-01",
  "3-2": "2003-08-01",
};

const achievementEnum = z.enum(["A", "B", "C", "D", "E"]);
const achievementOrEmpty = z.union([achievementEnum, z.literal("")]);

const schoolGpaBase = z.object({
  semester: z.enum(NEIS_SEMESTERS),
  subject_name: z.string().min(1, "과목명을 입력하세요."),
  credit_unit: z.coerce.number().int().positive("1 이상 입력하세요."),
});

const schoolGpaGeneral = schoolGpaBase
  .extend({
    subject_category: z.literal("general"),
    total_score: z.coerce.number({ message: "숫자를 입력하세요." }),
    raw_score: z.coerce.number({ message: "숫자를 입력하세요." }),
    avg_score: z.coerce.number({ message: "숫자를 입력하세요." }),
    stddev_score: z.coerce.number({ message: "숫자를 입력하세요." }),
    student_count: z.coerce.number().int().positive("1 이상 입력하세요."),
    class_rank: z.coerce.number().int().positive("1 이상 입력하세요."),
    rank_total: z.coerce.number().int().positive("1 이상 입력하세요."),
    school_grade: z.coerce.number().min(1).max(9),
    achievement_level: achievementOrEmpty,
  })
  .refine((d) => d.class_rank <= d.rank_total, {
    message: "석차는 전체 인원 이하여야 합니다.",
    path: ["class_rank"],
  });

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const schoolGpaCareer = schoolGpaBase.extend({
  subject_category: z.literal("career_choice"),
  total_score: z.preprocess(emptyToUndefined, z.coerce.number().optional()),
  raw_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  avg_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  stddev_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  student_count: z.coerce.number().int().positive("1 이상 입력하세요."),
  achievement_level: achievementEnum,
});

const schoolGpaPeArt = schoolGpaBase.extend({
  subject_category: z.literal("pe_art"),
  raw_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  achievement_level: achievementEnum,
});

export const schoolGpaFormSchema = z.discriminatedUnion("subject_category", [
  schoolGpaGeneral,
  schoolGpaCareer,
  schoolGpaPeArt,
]);

export type SchoolGpaFormValues = z.infer<typeof schoolGpaFormSchema>;

export const schoolGpaPostSchema = z
  .object({ record_type: z.literal("SCHOOL_GPA") })
  .and(schoolGpaFormSchema);

export type SchoolGpaPostBody = z.infer<typeof schoolGpaPostSchema>;
