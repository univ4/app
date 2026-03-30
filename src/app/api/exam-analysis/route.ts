import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { embedQuery } from "@/lib/chat/ragChat";
import { getExamChunksSummary } from "@/lib/exam-analysis/getExamChunksSummary";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const postBodySchema = z.object({
  query: z.string().min(1, "질문을 입력해 주세요.").max(2000),
  examType: z.enum(["논술", "면접"]),
  univName: z
    .string()
    .max(120)
    .optional()
    .transform((s) => (typeof s === "string" && s.trim().length > 0 ? s.trim() : undefined)),
  year: z.coerce.number().int().min(1990).max(2035).optional(),
  matchCount: z.coerce.number().int().min(1).max(50).optional(),
  matchThreshold: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(request: NextRequest) {
  void request;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
      },
      { status: 401 },
    );
  }

  const { data: summary, error } = await getExamChunksSummary(supabase);
  if (error) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: error.message },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      items: [],
      meta: {
        total: summary.total,
        univCount: summary.univCount,
      },
      filterOptions: {
        univNames: summary.univNames,
        years: summary.years,
      },
    },
    error: null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
      },
      { status: 401 },
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." },
      },
      { status: 400 },
    );
  }

  const parsed = postBodySchema.safeParse(rawJson);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: msg || "요청 형식이 올바르지 않습니다.",
        },
      },
      { status: 422 },
    );
  }

  const { data: summary, error: sumErr } = await getExamChunksSummary(supabase);
  if (sumErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: sumErr.message },
      },
      { status: 500 },
    );
  }

  if (summary.total === 0) {
    return NextResponse.json({
      data: { matches: [] as unknown[], meta: { total: 0 } },
      error: null,
    });
  }

  let embedding: number[];
  try {
    embedding = await embedQuery(parsed.data.query);
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

  const matchCount = parsed.data.matchCount ?? 8;
  const matchThreshold = parsed.data.matchThreshold ?? 0.6;

  const { data: rows, error: rpcErr } = await supabase.rpc("match_exam_chunks", {
    query_embedding: embedding,
    exam_type_filter: parsed.data.examType,
    univ_name_filter: parsed.data.univName ?? null,
    match_count: matchCount,
    match_threshold: matchThreshold,
    year_filter: parsed.data.year ?? null,
  });

  if (rpcErr) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: rpcErr.message },
      },
      { status: 500 },
    );
  }

  const matches = (rows ?? []) as Array<{
    id: number;
    chunk_text: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
    univ_name: string;
    year: number;
    exam_type: string;
    dept_name: string | null;
  }>;

  return NextResponse.json({
    data: {
      matches: matches.map((m) => ({
        id: m.id,
        chunkText: m.chunk_text,
        similarity: m.similarity,
        univName: m.univ_name,
        year: m.year,
        examType: m.exam_type,
        deptName: m.dept_name,
        metadata: m.metadata ?? {},
      })),
      meta: { total: summary.total },
    },
    error: null,
  });
}
