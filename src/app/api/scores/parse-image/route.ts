import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  mapNeisJsonToRow,
  visionSubjectToNeisJson,
  type AcademicNeisRow,
} from "@/lib/neis/mapNeisSubjectJsonToAcademicRow";
import {
  callNeisVisionExtract,
  sliceJsonObject,
} from "@/lib/neis/neisVisionAnthropic";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { NEIS_SEMESTERS, type NeisSemester } from "@/lib/validation/schoolGpaScore";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const BATCH_SIZE = 80;

const visionSubjectSchema = z.object({
  subjectName: z.string().min(1),
  grade: z.union([z.number(), z.null()]).optional(),
  rawScore: z.union([z.number(), z.null()]).optional(),
  classAvg: z.union([z.number(), z.null()]).optional(),
  stdDev: z.union([z.number(), z.null()]).optional(),
  creditUnit: z.union([z.number(), z.null()]).optional(),
  studentCount: z.union([z.number(), z.null()]).optional(),
  achievementLevel: z.union([z.string(), z.null()]).optional(),
});

const commitBodySchema = z.object({
  semester: z.enum(NEIS_SEMESTERS),
  subjects: z.array(visionSubjectSchema).min(1),
});

function parseNeisSemesterFromRoot(grade: unknown, semester: unknown): NeisSemester | null {
  const g = typeof grade === "number" ? grade : Number(grade);
  const s = typeof semester === "number" ? semester : Number(semester);
  if (!Number.isInteger(g) || !Number.isInteger(s)) return null;
  if (g < 1 || g > 3 || s < 1 || s > 2) return null;
  const key = `${g}-${s}`;
  return (NEIS_SEMESTERS as readonly string[]).includes(key)
    ? (key as NeisSemester)
    : null;
}

function resolveMediaType(file: File): "image/png" | "image/jpeg" | null {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "image/jpeg";
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function normalizeVisionSubject(raw: unknown): z.infer<typeof visionSubjectSchema> | null {
  const one = visionSubjectSchema.safeParse(raw);
  return one.success ? one.data : null;
}

type NeisVisionParsedPayload = {
  grade: number;
  semester: number;
  neisSemester: NeisSemester;
  subjects: z.infer<typeof visionSubjectSchema>[];
};

function parseVisionAssistantJson(text: string): NeisVisionParsedPayload | null {
  let data: unknown;
  try {
    data = JSON.parse(sliceJsonObject(text));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const neisSemester = parseNeisSemesterFromRoot(o.grade, o.semester);
  if (!neisSemester) return null;
  if (!Array.isArray(o.subjects)) return null;

  const subjects: z.infer<typeof visionSubjectSchema>[] = [];
  for (const item of o.subjects) {
    const n = normalizeVisionSubject(item);
    if (n) subjects.push(n);
  }

  const g = typeof o.grade === "number" ? o.grade : Number(o.grade);
  const s = typeof o.semester === "number" ? o.semester : Number(o.semester);
  if (!Number.isFinite(g) || !Number.isFinite(s)) return null;

  return {
    grade: g,
    semester: s,
    neisSemester,
    subjects,
  };
}

async function upsertNeisRows(
  supabase: SupabaseClient,
  rows: AcademicNeisRow[],
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("academic_records").upsert(batch, {
      onConflict: "student_id,semester,subject_name,credit_unit",
    });
    if (error) {
      for (const row of batch) {
        const { error: oneErr } = await supabase.from("academic_records").upsert(row, {
          onConflict: "student_id,semester,subject_name,credit_unit",
        });
        if (oneErr) {
          skipped += 1;
        } else {
          inserted += 1;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped };
}

function rowsFromVisionSubjects(
  studentId: string,
  neisSemester: NeisSemester,
  subjects: z.infer<typeof visionSubjectSchema>[],
): { rows: AcademicNeisRow[]; skipped: number } {
  const rows: AcademicNeisRow[] = [];
  let skipped = 0;
  for (const subj of subjects) {
    const neisJson = visionSubjectToNeisJson({
      subjectName: subj.subjectName,
      grade: subj.grade ?? null,
      rawScore: subj.rawScore ?? null,
      classAvg: subj.classAvg ?? null,
      stdDev: subj.stdDev ?? null,
      creditUnit: subj.creditUnit ?? null,
      studentCount: subj.studentCount ?? null,
      achievementLevel: subj.achievementLevel ?? null,
    });
    const mapped = mapNeisJsonToRow(studentId, neisSemester, neisJson);
    if (!mapped.ok) {
      skipped += 1;
      continue;
    }
    rows.push(mapped.row);
  }
  return { rows, skipped };
}

/**
 * POST multipart: NEIS 성적표 이미지 → Claude Vision → (선택) academic_records upsert
 * POST application/json: 파싱·수정된 과목 배열만 재적재 (Vision 미호출)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let rawJson: unknown;
    try {
      rawJson = await request.json();
    } catch {
      return NextResponse.json(
        {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "JSON 본문을 읽을 수 없습니다." },
        },
        { status: 422 },
      );
    }

    const parsed = commitBodySchema.safeParse(rawJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
          },
        },
        { status: 422 },
      );
    }

    const { rows, skipped: mapSkipped } = rowsFromVisionSubjects(
      user.id,
      parsed.data.semester,
      parsed.data.subjects,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        {
          data: {
            parsed: {
              grade: null,
              semester: null,
              neisSemester: parsed.data.semester,
              subjects: parsed.data.subjects,
            },
            inserted: 0,
            skipped: mapSkipped,
          },
          error: null,
        },
        { status: 200 },
      );
    }

    const { inserted, skipped: upsertSkipped } = await upsertNeisRows(supabase, rows);
    return NextResponse.json({
      data: {
        parsed: {
          grade: null,
          semester: null,
          neisSemester: parsed.data.semester,
          subjects: parsed.data.subjects,
        },
        inserted,
        skipped: mapSkipped + upsertSkipped,
      },
      error: null,
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "multipart 본문을 읽을 수 없습니다." },
      },
      { status: 422 },
    );
  }

  const file = formData.get("file") ?? formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "이미지 파일(file 또는 image 필드)이 필요합니다." },
      },
      { status: 422 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: `이미지는 최대 ${MAX_IMAGE_BYTES / 1024 / 1024}MB까지 업로드할 수 있습니다.`,
        },
      },
      { status: 422 },
    );
  }

  const mediaType = resolveMediaType(file);
  if (!mediaType) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "PNG 또는 JPEG 이미지만 업로드할 수 있습니다.",
        },
      },
      { status: 422 },
    );
  }

  const dryRun =
    formData.get("dry_run") === "1" ||
    formData.get("dry_run") === "true" ||
    formData.get("dry_run") === "on";

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "ANTHROPIC_API_KEY 가 설정되지 않았습니다.",
        },
      },
      { status: 500 },
    );
  }

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";

  let base64: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    base64 = buf.toString("base64");
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "이미지를 읽는 데 실패했습니다." },
      },
      { status: 500 },
    );
  }

  let assistantText: string;
  try {
    assistantText = await callNeisVisionExtract({
      apiKey,
      model,
      base64,
      mediaType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: msg },
      },
      { status: 500 },
    );
  }

  const visionParsed = parseVisionAssistantJson(assistantText);
  if (!visionParsed) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "이미지에서 성적 JSON을 해석하지 못했습니다. 더 선명한 이미지로 다시 시도해 주세요.",
        },
      },
      { status: 422 },
    );
  }

  const parsedPayload = {
    grade: visionParsed.grade,
    semester: visionParsed.semester,
    neisSemester: visionParsed.neisSemester,
    subjects: visionParsed.subjects,
  };

  const { rows, skipped: mapSkipped } = rowsFromVisionSubjects(
    user.id,
    visionParsed.neisSemester,
    visionParsed.subjects,
  );

  if (dryRun) {
    return NextResponse.json({
      data: {
        parsed: parsedPayload,
        inserted: 0,
        skipped: mapSkipped,
      },
      error: null,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      data: {
        parsed: parsedPayload,
        inserted: 0,
        skipped: mapSkipped,
      },
      error: null,
    });
  }

  const { inserted, skipped: upsertSkipped } = await upsertNeisRows(supabase, rows);

  return NextResponse.json({
    data: {
      parsed: parsedPayload,
      inserted,
      skipped: mapSkipped + upsertSkipped,
    },
    error: null,
  });
}
