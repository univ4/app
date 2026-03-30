import {
  NEIS_SEMESTER_TO_EXAM_DATE,
  type NeisSemester,
} from "@/lib/validation/schoolGpaScore";

const VALID_ACHIEVEMENT = new Set(["A", "B", "C", "D", "E"]);

export type NeisSubjectJson = {
  subject_name?: unknown;
  unit?: unknown;
  total_score?: unknown;
  raw_score?: unknown;
  class_avg?: unknown;
  std_dev?: unknown;
  student_count?: unknown;
  rank?: unknown;
  rank_total?: unknown;
  grade?: unknown;
  achievement?: unknown;
};

export type AcademicNeisRow = {
  student_id: string;
  record_type: "SCHOOL_GPA";
  exam_date: string;
  semester: NeisSemester;
  subject_category: "general" | "career_choice" | "pe_art";
  subject_name: string;
  credit_unit: number;
  total_score: number | null;
  raw_score: number | null;
  avg_score: number | null;
  stddev_score: number | null;
  student_count: number | null;
  class_rank: number | null;
  rank_total: number | null;
  school_grade: number | null;
  achievement_level: "A" | "B" | "C" | "D" | "E" | null;
};

function nullableFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t.length === 0) return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function nullablePositiveInt(v: unknown): number | null {
  const n = nullableFiniteNumber(v);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function normalizeAchievement(v: unknown): "A" | "B" | "C" | "D" | "E" | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const u = v.trim().toUpperCase();
  if (!VALID_ACHIEVEMENT.has(u)) return null;
  return u as "A" | "B" | "C" | "D" | "E";
}

function subjectCategory(
  grade: number | null,
  achievementNorm: "A" | "B" | "C" | "D" | "E" | null,
): "general" | "career_choice" | "pe_art" {
  if (grade !== null) return "general";
  if (achievementNorm !== null) return "career_choice";
  return "pe_art";
}

function rankPairValid(
  classRank: number | null,
  rankTotal: number | null,
): boolean {
  if (classRank === null && rankTotal === null) return true;
  if (classRank === null || rankTotal === null) return false;
  return classRank >= 1 && classRank <= rankTotal;
}

/**
 * `load_neis_grades.ts` / Claude Vision JSON 과목 1건 → `academic_records` upsert 행.
 */
export function mapNeisJsonToRow(
  studentId: string,
  semester: NeisSemester,
  raw: NeisSubjectJson,
): { ok: true; row: AcademicNeisRow } | { ok: false; reason: string } {
  if (typeof raw.subject_name !== "string" || !raw.subject_name.trim()) {
    return { ok: false, reason: "subject_name 없음" };
  }

  const credit_unit = nullablePositiveInt(raw.unit);
  if (credit_unit === null) {
    return { ok: false, reason: "unit 없음 또는 1 미만" };
  }

  const grade = nullableFiniteNumber(raw.grade);
  const achievementNorm = normalizeAchievement(raw.achievement);
  const category = subjectCategory(grade, achievementNorm);

  const cr = nullablePositiveInt(raw.rank);
  const rt = nullablePositiveInt(raw.rank_total);

  if (category === "general") {
    if (!rankPairValid(cr, rt)) {
      return {
        ok: false,
        reason: "보통교과 석차/전체인원 쌍 불일치(class_rank·rank_total)",
      };
    }
  }

  const exam_date = NEIS_SEMESTER_TO_EXAM_DATE[semester];
  const subject_name = raw.subject_name.trim();
  const total_score = nullableFiniteNumber(raw.total_score);
  const raw_score = nullableFiniteNumber(raw.raw_score);
  const avg_score = nullableFiniteNumber(raw.class_avg);
  const stddev_score = nullableFiniteNumber(raw.std_dev);
  const student_count = nullablePositiveInt(raw.student_count);

  const school_grade =
    category === "general" && grade !== null ? grade : null;

  const achievement_level = achievementNorm;

  let class_rank_out: number | null = null;
  let rank_total_out: number | null = null;
  let avg_out: number | null = avg_score;
  let std_out: number | null = stddev_score;
  let student_count_out: number | null = student_count;
  let total_out: number | null = total_score;

  if (category === "general") {
    class_rank_out = cr;
    rank_total_out = rt;
  } else if (category === "career_choice") {
    class_rank_out = null;
    rank_total_out = null;
  } else {
    class_rank_out = null;
    rank_total_out = null;
    avg_out = null;
    std_out = null;
    student_count_out = null;
    total_out = null;
  }

  return {
    ok: true,
    row: {
      student_id: studentId,
      record_type: "SCHOOL_GPA",
      exam_date,
      semester,
      subject_category: category,
      subject_name,
      credit_unit,
      total_score: total_out,
      raw_score,
      avg_score: avg_out,
      stddev_score: std_out,
      student_count: student_count_out,
      class_rank: class_rank_out,
      rank_total: rank_total_out,
      school_grade,
      achievement_level,
    },
  };
}

/** Claude Vision 과목 스키마 → `mapNeisJsonToRow` 입력 */
export function visionSubjectToNeisJson(input: {
  subjectName: string;
  grade?: number | null;
  rawScore?: number | null;
  classAvg?: number | null;
  stdDev?: number | null;
  creditUnit?: number | null;
  studentCount?: number | null;
  achievementLevel?: string | null;
}): NeisSubjectJson {
  return {
    subject_name: input.subjectName,
    unit: input.creditUnit,
    total_score: null,
    raw_score: input.rawScore,
    class_avg: input.classAvg,
    std_dev: input.stdDev,
    student_count: input.studentCount,
    rank: null,
    rank_total: null,
    grade: input.grade,
    achievement: input.achievementLevel,
  };
}
